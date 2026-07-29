# AskNeighbor — Operational Runbook

## 1. Service Inventory

| Service | URL | Dashboard | Cost |
|---|---|---|---|
| **Frontend** | https://askneighbor.org | [Vercel Dashboard](https://vercel.com/senthilsv1202s-projects/frontend) | Free |
| **Backend API** | https://askneighbor-api-production.up.railway.app | [Railway Dashboard](https://railway.com) | ~$5/mo |
| **Database** | `huekckyakokyzlysnger.supabase.co` | [Supabase Dashboard](https://supabase.com/dashboard/project/huekckyakokyzlysnger) | Free |
| **Domain** | askneighbor.org | [Squarespace DNS](https://account.squarespace.com/domains) | $9/yr |
| **SEO** | — | [Google Search Console](https://search.google.com/search-console) | Free |
| **Mobile App** | Expo Go | [GitHub Repo](https://github.com/senthilsv1202/askneighbor-mobile) | Free |

---

## 2. Environment Variables

### Backend (Railway)
```
PORT=3001
SUPABASE_URL=https://huekckyakokyzlysnger.supabase.co
SUPABASE_SERVICE_KEY=<service-role-key>
FRONTEND_URL=https://frontend-six-lake-82.vercel.app,https://askneighbor.dhanishsoftwaresolutions.com,https://askneighbor.org,https://www.askneighbor.org
ANTHROPIC_API_KEY=<anthropic-api-key>
```

### Frontend (Vercel)
```
VITE_SUPABASE_URL=https://huekckyakokyzlysnger.supabase.co
VITE_SUPABASE_ANON_KEY=<supabase-anon-key>
VITE_API_URL=https://askneighbor-api-production.up.railway.app
```

---

## 3. Local Development

### Prerequisites
- Node.js 22+
- npm
- Git

### Backend
```bash
cd backend
cp .env.example .env   # fill in your keys
npm install
npm run dev            # starts on http://localhost:3001
```

### Frontend
```bash
cd frontend
cp .env.example .env   # fill in your keys
npm install
npm run dev            # starts on http://localhost:5173
```

### Mobile
```bash
cd ../askneighbor-mobile
npm install
npx expo start         # scan QR code with Expo Go
```

---

## 4. Deployment

### Deploy Frontend (Vercel)
```bash
cd frontend
vercel --yes --prod
```
Or push to `main` branch if auto-deploy is connected.

### Deploy Backend (Railway)
```bash
cd backend
railway up --detach --service askneighbor-api
```

### Deploy Both
```bash
# From project root
cd frontend && vercel --yes --prod
cd ../backend && railway up --detach --service askneighbor-api
```

---

## 5. Database Operations

### Access SQL Editor
https://supabase.com/dashboard/project/huekckyakokyzlysnger/sql/new

### Run Initial Schema
Copy and paste `backend/schema.sql` into the SQL Editor.

### Run Migration Scripts
- `multi-community.sql` — adds `community_id` to providers
- `privacy-and-removal.sql` — adds `removal_requests` table
- `fix-trigger.sql` — fixes signup trigger

### Backup Database
Supabase Dashboard → Settings → Database → Backups (automatic daily backups on paid plans).

### Check Table Row Counts
```sql
SELECT 'profiles' as t, count(*) FROM profiles
UNION ALL SELECT 'providers', count(*) FROM providers
UNION ALL SELECT 'reviews', count(*) FROM reviews
UNION ALL SELECT 'communities', count(*) FROM communities
UNION ALL SELECT 'community_members', count(*) FROM community_members;
```

---

## 6. Health Checks

### Backend Health
```bash
curl https://askneighbor-api-production.up.railway.app/api/health
# Expected: {"status":"ok"}
```

### Frontend Health
```bash
curl -s -o /dev/null -w "%{http_code}" https://askneighbor.org
# Expected: 200
```

### Database Health
```bash
curl -s "https://huekckyakokyzlysnger.supabase.co/rest/v1/categories?select=name&limit=1" \
  -H "apikey: <anon-key>"
# Expected: JSON array with category
```

### Full Stack Check
```bash
curl -s https://askneighbor-api-production.up.railway.app/api/categories | head -1
# Expected: JSON array of 12 categories
```

---

## 7. Common Issues & Fixes

### Issue: "Email rate limit exceeded" on signup
**Cause:** Supabase free tier limits to 4 confirmation emails/hour.
**Fix:** Disable email confirmation in Supabase Dashboard → Auth → Providers → Email → Turn off "Confirm email".

### Issue: "Could not find column in schema cache"
**Cause:** Migration SQL wasn't run after code deployment.
**Fix:** Run the relevant `.sql` migration file in Supabase SQL Editor.

### Issue: "Database error saving new user"
**Cause:** Signup trigger has circular dependency with profiles table FK.
**Fix:** Run `fix-trigger.sql` in Supabase SQL Editor.

### Issue: CORS errors in browser console
**Cause:** Frontend domain not in `FRONTEND_URL` env var on Railway.
**Fix:**
```bash
railway variables set FRONTEND_URL="https://domain1.com,https://domain2.com" --service askneighbor-api
railway up --detach --service askneighbor-api
```

### Issue: Provider phone numbers not showing
**Cause:** Phone masking function in backend returns masked values in list view.
**Expected behavior:** List view shows `(***) ***-4567`, detail view shows full number.

### Issue: Expo Go "incompatible version"
**Cause:** Expo SDK version mismatch between project and Expo Go app.
**Fix:** Check Expo Go version on phone, recreate project with matching SDK: `npx create-expo-app --template blank@sdk-<version>`

### Issue: DNS not propagating for new domain
**Fix:**
```bash
# Flush local DNS cache (macOS)
sudo dscacheutil -flushcache && sudo killall -HUP mDNSResponder

# Check propagation
nslookup askneighbor.org 8.8.8.8
```

---

## 8. Adding a New Community

### Via API (Admin)
```bash
curl -s "https://huekckyakokyzlysnger.supabase.co/rest/v1/communities" \
  -H "apikey: <service-role-key>" \
  -H "Authorization: Bearer <service-role-key>" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d '{
    "name": "Community Name",
    "slug": "community-slug",
    "description": "Description",
    "city": "City",
    "state": "ST",
    "zip_code": "12345",
    "created_by": "<user-uuid>",
    "invite_code": "CODE1234"
  }'
```

### Via App
Users can create communities from:
- Web: Home → Community dropdown → "Create New Community"
- Mobile: Home → "Create a Community" card

---

## 9. Processing Removal Requests

### View Pending Requests
```sql
SELECT r.*, p.name as provider_name
FROM removal_requests r
JOIN providers p ON r.provider_id = p.id
WHERE r.status = 'pending'
ORDER BY r.created_at;
```

### Approve Removal (Delete Provider)
```sql
-- Mark request as approved
UPDATE removal_requests SET status = 'approved', reviewed_at = NOW() WHERE id = '<request-id>';

-- Delete the provider (cascades to reviews, favorites)
DELETE FROM providers WHERE id = '<provider-id>';
```

### Reject Removal
```sql
UPDATE removal_requests SET status = 'rejected', reviewed_at = NOW() WHERE id = '<request-id>';
```

---

## 10. Monitoring

### Railway Logs
```bash
railway logs --service askneighbor-api
```

### Vercel Deployment Logs
```bash
vercel logs <deployment-url>
```

### Supabase Database Logs
Supabase Dashboard → Logs → Postgres

### Check API Response Times
```bash
curl -o /dev/null -s -w "Time: %{time_total}s\n" https://askneighbor-api-production.up.railway.app/api/categories
```

---

## 11. Scaling Considerations

| Threshold | Action |
|---|---|
| 100+ concurrent users | Upgrade Railway plan, add connection pooling |
| 10,000+ providers | Add pagination caching, consider Elasticsearch |
| 50+ communities | Add community-level caching in Redis |
| High AI parse usage | Add queue (Bull) for parse requests, rate limit per user |
| App Store readiness | Set up EAS Build, Apple Developer account ($99/yr) |

---

## 12. DNS Configuration

### askneighbor.org (Squarespace)
| Type | Host | Value |
|---|---|---|
| A | @ | 76.76.21.21 |
| CNAME | www | cname.vercel-dns.com |

### askneighbor.dhanishsoftwaresolutions.com (Squarespace)
| Type | Host | Value |
|---|---|---|
| CNAME | askneighbor | cname.vercel-dns.com |

---

## 13. Security Checklist

- [ ] Supabase service role key is NOT exposed in frontend code
- [ ] Anon key is used in frontend (safe, limited by RLS)
- [ ] Rate limiting is enabled (200 req/15 min)
- [ ] CORS restricted to known domains
- [ ] RLS enabled on all tables
- [ ] Provider contact info masked in list endpoints
- [ ] Consent checkbox on provider submission
- [ ] Removal request form on every provider page
- [ ] No sensitive data in URL parameters
- [ ] JWT tokens stored in SecureStore (mobile) / memory (web)
