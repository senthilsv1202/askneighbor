#!/usr/bin/env node
/**
 * Bulk-import recommendations from a WhatsApp chat export.
 *
 *   node scripts/import-chat.mjs <export.txt> --community <id>            # dry run
 *   node scripts/import-chat.mjs <export.txt> --community <id> --apply    # write
 *
 * Why a script rather than the in-app importer: POST /api/parse/chat-export
 * truncates input to 15k characters, and the Add page applies one parsed result
 * at a time. A two-year group export is hundreds of thousands of characters and
 * yields a hundred-plus recommendations, so both limits make it unusable here.
 *
 * Dry run by default. Nothing is written without --apply, and re-running is safe:
 * anything matching an existing provider by phone or by name is skipped.
 */
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.join(import.meta.dirname, '..', '.env') });

const MODEL = 'claude-sonnet-4-6';
const CHUNK_CHARS = 12000;   // comfortably inside the context we want per call
const CONCURRENCY = 3;       // modest, to stay clear of rate limits

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith('--'));
const flag = (name) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? null : args[i + 1];
};
const APPLY = args.includes('--apply');
const communityId = flag('community');
const maxChunks = Number(flag('limit')) || Infinity;

if (!file || !communityId) {
  console.error('Usage: node scripts/import-chat.mjs <export.txt> --community <id> [--apply] [--limit N]');
  process.exit(1);
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── Clean the export ────────────────────────────────────────────────────────
// WhatsApp exports are mostly noise: join/leave notices, media placeholders and
// the encryption banner. Stripping them cuts token spend substantially.
const NOISE = [
  /<Media omitted>/i,
  /Messages and calls are end-to-end encrypted/i,
  /^\s*$/,
  /\b(added|removed|left|joined|created group|changed the subject|changed this group's icon|changed their phone number)\b/i,
  /This message was deleted/i,
  /\bnull\b$/i,
];

function cleanExport(raw) {
  return raw
    .split(/\r?\n/)
    .filter((line) => !NOISE.some((re) => re.test(line)))
    .join('\n');
}

// Prefer to split on message boundaries so a recommendation is never cut in half.
// WhatsApp lines start with a date like "12/03/2024, 9:15 pm - Name: text".
const MESSAGE_START = /^\[?\d{1,2}[/.]\d{1,2}[/.]\d{2,4}[,\]]?\s/;
// Text copied out of WhatsApp by hand has no date prefixes, so the boundary above
// never matches and nothing would ever split. This is the backstop: past it, cut
// wherever we are rather than sending one enormous request.
const HARD_MAX = Math.floor(CHUNK_CHARS * 1.5);

function chunk(text) {
  // A single line can itself exceed the cap when a whole conversation is pasted
  // as one blob, so break oversized lines up before grouping them.
  const lines = [];
  for (const line of text.split('\n')) {
    if (line.length <= HARD_MAX) { lines.push(line); continue; }
    for (let i = 0; i < line.length; i += CHUNK_CHARS) {
      lines.push(line.slice(i, i + CHUNK_CHARS));
    }
  }

  const chunks = [];
  let current = [];
  let size = 0;

  for (const line of lines) {
    const next = size + line.length + 1;
    const atBoundary = next > CHUNK_CHARS && MESSAGE_START.test(line);
    const tooBig = next > HARD_MAX;

    if (current.length && (atBoundary || tooBig)) {
      chunks.push(current.join('\n'));
      current = [];
      size = 0;
    }
    current.push(line);
    size += line.length + 1;
  }
  if (current.length) chunks.push(current.join('\n'));
  return chunks;
}

// ── Extraction ──────────────────────────────────────────────────────────────
const PROMPT = (categories, text) => `Extract every service-provider recommendation from this WhatsApp group export. Neighbours recommend doctors, plumbers, tutors, restaurants and similar to each other.

For each recommendation return:
{
  "name": "business or person recommended",
  "category": "one of: ${categories.join(', ')}",
  "phone": "phone if mentioned, else null",
  "email": null or email,
  "website": null or url,
  "city": null or city,
  "state": null or two-letter state,
  "description": "one or two sentences on why it was recommended, in the recommender's own sense",
  "services": ["specific services mentioned"],
  "recommended_by": "first name of whoever recommended it, if visible"
}

Rules:
- Only include an actual recommendation of a specific named provider.
- Skip questions with no answer, general chatter, and complaints.
- If the same provider is recommended several times, return it once.
- Never invent a phone number or detail that is not in the text.
- Return a JSON array. Return [] if there are no recommendations.
Return only JSON.

Chat:
"""
${text}
"""`;

function parseJson(text) {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  return JSON.parse(cleaned);
}

async function extract(text, categories, label) {
  try {
    const res = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4096,
      messages: [{ role: 'user', content: PROMPT(categories, text) }],
    });
    const parsed = parseJson(res.content[0].text);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch (err) {
    console.warn(`  ! ${label} failed: ${err.message.slice(0, 90)}`);
    return [];
  }
}

// Small concurrency pool — enough to be quick, gentle enough to avoid 429s.
async function mapPool(items, limit, fn) {
  const out = [];
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (i < items.length) {
        const index = i++;
        out[index] = await fn(items[index], index);
      }
    })
  );
  return out;
}

// ── Normalise and dedupe ────────────────────────────────────────────────────
const digits = (s) => (s || '').replace(/\D/g, '').slice(-10);
const normName = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

function dedupe(records, existing) {
  const seenPhone = new Set(existing.map((p) => digits(p.phone)).filter((d) => d.length === 10));
  const seenName = new Set(existing.map((p) => normName(p.name)));
  const kept = [];
  const skipped = [];

  for (const r of records) {
    if (!r || !r.name || !r.name.trim()) continue;
    const phone = digits(r.phone);
    const name = normName(r.name);
    if ((phone.length === 10 && seenPhone.has(phone)) || seenName.has(name)) {
      skipped.push(r.name);
      continue;
    }
    if (phone.length === 10) seenPhone.add(phone);
    seenName.add(name);
    kept.push(r);
  }
  return { kept, skipped };
}

// ── Run ─────────────────────────────────────────────────────────────────────
const raw = fs.readFileSync(file, 'utf8');
const cleaned = cleanExport(raw);
const chunks = chunk(cleaned).slice(0, maxChunks);

console.log(`file        : ${path.basename(file)}`);
console.log(`raw         : ${raw.length.toLocaleString()} chars`);
console.log(`after clean : ${cleaned.length.toLocaleString()} chars`);
console.log(`chunks      : ${chunks.length} (~${CHUNK_CHARS} chars each)`);
console.log(`mode        : ${APPLY ? 'APPLY — will write to the database' : 'DRY RUN — nothing will be written'}\n`);

const { data: community } = await supabase
  .from('communities').select('id, name, created_by').eq('id', communityId).single();
if (!community) { console.error('No such community.'); process.exit(1); }

const { data: categories } = await supabase.from('categories').select('id, name');
const categoryNames = categories.map((c) => c.name);
const categoryByName = new Map(categories.map((c) => [c.name.toLowerCase(), c.id]));

const { data: existing } = await supabase
  .from('providers').select('name, phone').eq('community_id', communityId);

console.log(`community   : ${community.name}`);
console.log(`already has : ${existing.length} providers\n`);

console.log('extracting…');
const results = await mapPool(chunks, CONCURRENCY, async (text, i) => {
  const found = await extract(text, categoryNames, `chunk ${i + 1}`);
  process.stdout.write(`  chunk ${i + 1}/${chunks.length}: ${found.length} found\n`);
  return found;
});

const all = results.flat();
const { kept, skipped } = dedupe(all, existing);

console.log(`\nextracted ${all.length}, ${skipped.length} duplicates skipped, ${kept.length} new\n`);

const rows = [];
const unmapped = [];
for (const r of kept) {
  const categoryId = categoryByName.get((r.category || '').toLowerCase());
  if (!categoryId) { unmapped.push(r); continue; }
  // Attribution matters: "recommended by Priya" is what makes this the group's
  // memory rather than an anonymous directory.
  const credit = r.recommended_by ? ` Recommended by ${r.recommended_by}.` : '';
  rows.push({
    name: r.name.trim(),
    category_id: categoryId,
    community_id: communityId,
    phone: r.phone || null,
    email: r.email || null,
    website: r.website || null,
    city: r.city || null,
    state: r.state || null,
    description: ((r.description || '') + credit).trim() || null,
    services: Array.isArray(r.services) ? r.services.filter(Boolean) : [],
    added_by: community.created_by,
  });
}

const byCategory = {};
for (const row of rows) {
  const name = categories.find((c) => c.id === row.category_id).name;
  (byCategory[name] ||= []).push(row.name);
}
const rowByName = new Map(rows.map((r) => [r.name, r]));
for (const [name, list] of Object.entries(byCategory).sort((a, b) => b[1].length - a[1].length)) {
  console.log(`\n${name} (${list.length})`);
  for (const n of list) {
    const row = rowByName.get(n);
    console.log(`   ${n}${row.phone ? `  ${row.phone}` : ''}`);
    if (row.description) console.log(`      ${row.description}`);
  }
}
if (skipped.length) {
  console.log(`\nalready in the directory, skipped: ${skipped.join(', ')}`);
}
if (unmapped.length) {
  console.log(`\nunmapped category, skipped: ${unmapped.map((u) => `${u.name} [${u.category}]`).join(', ')}`);
}

if (!APPLY) {
  console.log(`\nDry run. Re-run with --apply to insert these ${rows.length} providers.`);
  process.exit(0);
}

const { data: inserted, error } = await supabase.from('providers').insert(rows).select('id');
if (error) { console.error('\ninsert failed:', error.message); process.exit(1); }
console.log(`\ninserted ${inserted.length} providers into ${community.name}.`);
