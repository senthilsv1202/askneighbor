import { Router } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

const CATEGORIES = [
  'Doctors & Medical', 'Home Services', 'Auto Services', 'Education & Tutoring',
  'Childcare', 'Restaurants & Food', 'Legal & Financial', 'Beauty & Wellness',
  'Real Estate', 'Pet Services', 'Cleaning Services', 'Technology'
];

router.post('/message', requireAuth, async (req, res) => {
  const { message } = req.body;
  if (!message || message.trim().length < 10) {
    return res.status(400).json({ error: 'Please provide a message with at least 10 characters' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'AI parsing is not configured' });

  const client = new Anthropic({ apiKey });

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: `Extract service provider details from this WhatsApp message or chat excerpt. Return a JSON object with these fields (use null for missing info):

{
  "name": "Business or provider name",
  "category": "One of: ${CATEGORIES.join(', ')}",
  "phone": "Phone number if mentioned",
  "email": "Email if mentioned",
  "website": "Website if mentioned",
  "address": "Street address if mentioned",
  "city": "City if mentioned",
  "state": "State abbreviation if mentioned",
  "zip_code": "ZIP code if mentioned",
  "description": "A helpful 1-2 sentence description based on what was said",
  "services": ["List of specific services mentioned"],
  "insurance_accepted": ["List of insurance plans mentioned"],
  "confidence": "high, medium, or low — how confident are you this is a recommendation?"
}

If the message contains MULTIPLE recommendations, return an array of objects.
If the message is not a recommendation at all, return: {"error": "This doesn't appear to be a recommendation", "confidence": "low"}

Only return valid JSON, no other text.

Message:
"""
${message}
"""`
      }]
    });

    const text = response.content[0].text.trim();
    const parsed = JSON.parse(text);
    res.json(Array.isArray(parsed) ? { providers: parsed } : { providers: [parsed] });
  } catch (err) {
    if (err instanceof SyntaxError) {
      return res.status(500).json({ error: 'Failed to parse AI response' });
    }
    res.status(500).json({ error: err.message });
  }
});

router.post('/chat-export', requireAuth, async (req, res) => {
  const { text } = req.body;
  if (!text || text.trim().length < 20) {
    return res.status(400).json({ error: 'Please provide WhatsApp chat export text' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'AI parsing is not configured' });

  const client = new Anthropic({ apiKey });

  const truncated = text.slice(0, 15000);

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      messages: [{
        role: 'user',
        content: `Analyze this WhatsApp group chat export and extract ALL service provider recommendations. People in this chat are recommending doctors, handymen, restaurants, tutors, and other service providers to each other.

For each recommendation found, return a JSON object with:
{
  "name": "Business or provider name",
  "category": "One of: ${CATEGORIES.join(', ')}",
  "phone": "Phone number if mentioned",
  "email": "Email if mentioned",
  "website": "Website if mentioned",
  "address": "Street address if mentioned",
  "city": "City if mentioned",
  "state": "State abbreviation if mentioned",
  "zip_code": "ZIP code if mentioned",
  "description": "A helpful 1-2 sentence description based on what was said",
  "services": ["List of specific services mentioned"],
  "insurance_accepted": ["List of insurance plans mentioned"],
  "recommended_by": "Name of person who recommended (from the chat)",
  "original_message": "The exact message that contained this recommendation"
}

Return a JSON array of all recommendations found. Skip general chatter, questions without answers, and messages that aren't recommendations. Only return valid JSON, no other text.

Chat export:
"""
${truncated}
"""`
      }]
    });

    const text2 = response.content[0].text.trim();
    const parsed = JSON.parse(text2);
    const providers = Array.isArray(parsed) ? parsed : [parsed];
    res.json({ providers, count: providers.length });
  } catch (err) {
    if (err instanceof SyntaxError) {
      return res.status(500).json({ error: 'Failed to parse AI response' });
    }
    res.status(500).json({ error: err.message });
  }
});

export default router;
