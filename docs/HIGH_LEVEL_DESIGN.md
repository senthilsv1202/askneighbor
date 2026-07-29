# AskNeighbor — High-Level Design Document

## 1. Overview

**AskNeighbor** is a private, invite-only community recommendation directory that allows neighborhood groups to share and discover trusted local service providers — doctors, handymen, restaurants, tutors, and more.

The platform solves the problem of valuable recommendations getting lost in WhatsApp group chats by providing a permanent, searchable, category-based directory backed by ratings and reviews from people users actually know and trust.

### Key Differentiators
- **Invite-only access** — no public browsing, community-gated
- **AI-powered ingestion** — paste a WhatsApp message and AI extracts provider details
- **Multi-community** — each neighborhood/group has its own directory with nearby community browsing
- **Privacy-first** — contact masking, consent checks, provider removal requests

---

## 2. Architecture

```
┌─────────────────────────────────────────────────────────┐
│                        CLIENTS                          │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Web App    │  │  Mobile App  │  │     PWA      │  │
│  │  React 18    │  │ React Native │  │  (Web App    │  │
│  │  Vite        │  │ Expo SDK 54  │  │  installed)  │  │
│  │  Tailwind v4 │  │              │  │              │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │
│         │                 │                 │          │
└─────────┼─────────────────┼─────────────────┼──────────┘
          │                 │                 │
          ▼                 ▼                 ▼
┌─────────────────────────────────────────────────────────┐
│                    BACKEND API                          │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │              Express.js Server                   │   │
│  │                                                   │   │
│  │  /api/categories    — Browse categories          │   │
│  │  /api/providers     — CRUD providers + search    │   │
│  │  /api/reviews       — CRUD reviews               │   │
│  │  /api/favorites     — User favorites              │   │
│  │  /api/communities   — Community management        │   │
│  │  /api/invites       — Invite code validation      │   │
│  │  /api/parse         — AI message parsing          │   │
│  │                                                   │   │
│  │  Middleware: Auth (JWT) | Rate Limiting | CORS    │   │
│  └─────────────────────┬───────────────────────────┘   │
│                         │                               │
└─────────────────────────┼───────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          ▼                               ▼
┌──────────────────┐           ┌──────────────────┐
│    Supabase      │           │   Anthropic API  │
│                  │           │                  │
│  PostgreSQL DB   │           │  Claude Sonnet   │
│  Auth (JWT)      │           │  Message parsing │
│  Row Level       │           │  Chat export     │
│  Security        │           │  parsing         │
│  Realtime        │           │                  │
└──────────────────┘           └──────────────────┘
```

---

## 3. Tech Stack

### Frontend (Web)
| Technology | Version | Purpose |
|---|---|---|
| React | 18.2 | UI framework |
| Vite | 5.x | Build tool and dev server |
| Tailwind CSS | 4.x | Utility-first styling |
| React Router | 6.x | Client-side routing |
| Lucide React | 1.x | Icon library |
| Supabase JS | 2.x | Auth client |

### Frontend (Mobile)
| Technology | Version | Purpose |
|---|---|---|
| React Native | 0.76.x | Cross-platform mobile framework |
| Expo | SDK 54 | Development and build toolchain |
| React Navigation | 7.x | Tab and stack navigation |
| Expo Secure Store | — | Token persistence on device |
| Ionicons | — | Icon library |

### Backend
| Technology | Version | Purpose |
|---|---|---|
| Node.js | 22.x | Runtime |
| Express | 4.x | HTTP server |
| Helmet | 7.x | Security headers |
| express-rate-limit | 7.x | API rate limiting |
| CORS | 2.x | Cross-origin access control |
| Anthropic SDK | 0.20.x | Claude AI for message parsing |

### Database & Auth
| Technology | Purpose |
|---|---|
| Supabase (PostgreSQL) | Primary database |
| Supabase Auth | User authentication (email/password) |
| Row Level Security (RLS) | Data access policies |
| Full-text search (tsvector) | Provider search |
| Database triggers | Auto-update ratings, profile creation |

### Infrastructure
| Service | Purpose | Cost |
|---|---|---|
| Vercel | Frontend hosting + CDN | Free tier |
| Railway | Backend API hosting | ~$5/month |
| Supabase | Database + Auth | Free tier |
| Anthropic API | AI message parsing | Pay per use |
| Squarespace | Domain DNS (askneighbor.org) | $9/year |

---

## 4. Database Schema

### Entity Relationship Diagram

```
profiles
  ├── id (PK, FK → auth.users)
  ├── full_name, email, avatar_url
  ├── city, state, zip_code
  └── is_verified, created_at, updated_at

communities
  ├── id (PK)
  ├── name, slug, description
  ├── city, state, zip_code
  ├── created_by (FK → profiles)
  ├── invite_code (unique)
  └── is_active, created_at

community_members
  ├── id (PK)
  ├── community_id (FK → communities)
  ├── user_id (FK → profiles)
  ├── role (admin | moderator | member)
  └── invited_by (FK → profiles), joined_at

invites
  ├── id (PK)
  ├── community_id (FK → communities)
  ├── code (unique)
  ├── created_by (FK → profiles)
  ├── max_uses, use_count, expires_at
  └── is_active, created_at

categories
  ├── id (PK)
  ├── name (unique), slug (unique)
  ├── icon, description
  ├── parent_id (FK → categories, self-ref)
  └── sort_order, created_at

providers
  ├── id (PK)
  ├── name, description
  ├── category_id (FK → categories)
  ├── community_id (FK → communities)
  ├── phone, email, website
  ├── address, city, state, zip_code
  ├── insurance_accepted (text[]), services (text[])
  ├── hours (JSONB)
  ├── avg_rating, review_count
  ├── added_by (FK → profiles)
  ├── is_verified
  ├── fts (tsvector, auto-generated)
  └── created_at, updated_at

reviews
  ├── id (PK)
  ├── provider_id (FK → providers)
  ├── user_id (FK → profiles)
  ├── rating (1-5), title, body
  ├── is_verified
  └── created_at, updated_at
  └── UNIQUE(provider_id, user_id)

favorites
  ├── id (PK)
  ├── user_id (FK → profiles)
  ├── provider_id (FK → providers)
  └── created_at
  └── UNIQUE(user_id, provider_id)

removal_requests
  ├── id (PK)
  ├── provider_id (FK → providers)
  ├── reason, requester_name, requester_email
  ├── status (pending | approved | rejected)
  └── reviewed_at, created_at
```

### Key Indexes
- `idx_providers_category` — fast category filtering
- `idx_providers_city` — location-based queries
- `idx_providers_rating` — sorted by rating
- `idx_providers_fts` — GIN index for full-text search
- `idx_providers_community` — community scoping
- `idx_reviews_provider` — reviews per provider
- `idx_invites_code` — fast invite code lookup

### Database Triggers
| Trigger | Action |
|---|---|
| `on_auth_user_created` | Auto-creates profile row when user signs up |
| `reviews_rating_update` | Recalculates avg_rating and review_count on provider when review is added/updated/deleted |
| `providers_updated_at` | Updates timestamp on provider modification |

---

## 5. API Endpoints

### Public (No Auth)
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Health check |
| POST | `/api/invites/validate` | Validate an invite code |
| POST | `/api/providers/:id/removal-request` | Request provider removal |

### Authenticated (JWT Required)
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/categories` | List all categories |
| GET | `/api/categories/:slug` | Get category by slug |
| GET | `/api/providers` | Search/list providers (masked contact info) |
| GET | `/api/providers/:id` | Get provider details (full contact info) |
| POST | `/api/providers` | Add a new provider |
| PUT | `/api/providers/:id` | Update provider (owner only) |
| GET | `/api/reviews/provider/:id` | Get reviews for a provider |
| POST | `/api/reviews` | Submit a review |
| PUT | `/api/reviews/:id` | Update own review |
| DELETE | `/api/reviews/:id` | Delete own review |
| GET | `/api/favorites` | List user's favorites |
| POST | `/api/favorites` | Add to favorites |
| DELETE | `/api/favorites/:providerId` | Remove from favorites |
| POST | `/api/invites/join` | Join community with invite code |
| POST | `/api/invites/generate` | Generate new invite code |
| GET | `/api/communities/my` | List user's communities |
| POST | `/api/communities` | Create new community |
| GET | `/api/communities/nearby` | List nearby communities |
| GET | `/api/communities/:id/members` | List community members |
| POST | `/api/parse/message` | AI parse a WhatsApp message |
| POST | `/api/parse/chat-export` | AI parse a chat export |

### Query Parameters (GET /api/providers)
| Param | Description |
|---|---|
| `category` | Filter by category slug |
| `city` | Filter by city (partial match) |
| `zip` | Filter by ZIP code |
| `q` | Full-text search query |
| `sort` | `rating` (default), `reviews`, `newest` |
| `community_id` | Scope to community |
| `nearby` | `true` to include nearby communities |
| `page` | Pagination page number |
| `limit` | Results per page (default 20) |

---

## 6. Authentication Flow

```
User opens app
    │
    ▼
┌─────────────────┐
│  Enter Invite   │
│  Code           │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌─────────────────┐
│  POST /invites/ │────▶│  Valid? Join     │
│  validate       │     │  community      │
└────────┬────────┘     └────────┬────────┘
         │                       │
         ▼                       ▼
┌─────────────────┐     ┌─────────────────┐
│  Sign Up /      │────▶│  Supabase Auth  │
│  Sign In        │     │  issues JWT     │
└─────────────────┘     └────────┬────────┘
                                 │
                                 ▼
                        ┌─────────────────┐
                        │  JWT stored in  │
                        │  localStorage   │
                        │  (web) or       │
                        │  SecureStore    │
                        │  (mobile)       │
                        └────────┬────────┘
                                 │
                                 ▼
                        ┌─────────────────┐
                        │  All API calls  │
                        │  include JWT in │
                        │  Authorization  │
                        │  header         │
                        └─────────────────┘
```

---

## 7. Privacy & Security

| Feature | Implementation |
|---|---|
| **Invite-only access** | Signup requires valid invite code |
| **Auth-gated API** | All provider/search endpoints require JWT |
| **Contact masking** | Phone: `(***) ***-4567`, Email: `se***@domain.com` in list views |
| **Full details on detail page** | Authenticated members only |
| **Consent on submission** | Checkbox confirming info is public/permitted |
| **Right to removal** | Any provider can request removal (no auth needed) |
| **Rate limiting** | 200 requests per 15 minutes per IP |
| **Security headers** | Helmet.js (HSTS, XSS protection, etc.) |
| **Row Level Security** | Supabase RLS policies on all tables |
| **Secure token storage** | SecureStore (iOS/Android), httpOnly patterns (web) |
| **CORS** | Restricted to known frontend domains |

---

## 8. Multi-Community Architecture

```
┌─────────────────────────────────────────┐
│              AskNeighbor                │
│                                         │
│  ┌───────────┐  ┌───────────┐          │
│  │  Arbors   │  │  Edison   │          │
│  │ Community │  │ Community │  . . .   │
│  │           │  │           │          │
│  │ Providers │  │ Providers │          │
│  │ Members   │  │ Members   │          │
│  │ Reviews   │  │ Reviews   │          │
│  └─────┬─────┘  └─────┬─────┘          │
│        │              │                 │
│        └──── nearby ───┘                │
│        (same state)                     │
└─────────────────────────────────────────┘
```

- Each community has its own invite code and admin
- Providers are scoped to a community via `community_id`
- Users can be members of multiple communities
- "Nearby" communities = same state, browsable but distinct
- Any signed-in user can create a new community

---

## 9. AI Message Parsing (Claude Integration)

### Single Message Parsing
```
Input:  "Dr. Sharma on Main St is great for kids, 732-555-0101, accepts Aetna"

Claude extracts:
{
  "name": "Dr. Sharma",
  "category": "Doctors & Medical",
  "phone": "732-555-0101",
  "address": "Main St",
  "description": "Great pediatrician, good with kids",
  "insurance_accepted": ["Aetna"],
  "confidence": "high"
}
```

### Chat Export Parsing
- Accepts full WhatsApp chat export text (up to 15,000 chars)
- Claude identifies all recommendation messages
- Returns array of extracted providers
- Includes `recommended_by` and `original_message` for traceability

---

## 10. PWA Configuration

| Feature | Value |
|---|---|
| Display mode | `standalone` (no browser chrome) |
| Theme color | `#2563EB` (blue) |
| Caching strategy | Network-first with offline fallback |
| Service worker | Caches static assets, skips API calls |
| iOS support | `apple-mobile-web-app-capable` meta tags |
| Install prompt | Native "Add to Home Screen" via Safari/Chrome |

---

## 11. SEO Strategy

| Component | Implementation |
|---|---|
| Meta tags | Title, description, keywords |
| Open Graph | Facebook/WhatsApp link previews |
| Twitter Cards | Summary with large image |
| Structured Data | JSON-LD WebApplication schema |
| Sitemap | `/sitemap.xml` with key pages |
| robots.txt | Allows crawling, references sitemap |
| Google Search Console | Verified, sitemap submitted |
| Canonical URL | `https://askneighbor.org` |

---

## 12. Seeded Categories

| # | Category | Icon | Description |
|---|---|---|---|
| 1 | Doctors & Medical | stethoscope | Pediatricians, dentists, eye doctors, specialists |
| 2 | Home Services | wrench | Handymen, plumbers, electricians, HVAC, painters |
| 3 | Auto Services | car | Mechanics, body shops, car wash, towing |
| 4 | Education & Tutoring | graduation-cap | Tutors, music teachers, test prep, schools |
| 5 | Childcare | baby | Babysitters, daycares, nannies, after-school programs |
| 6 | Restaurants & Food | utensils | Restaurants, grocery stores, catering, bakeries |
| 7 | Legal & Financial | scale | Lawyers, CPAs, tax consultants, financial advisors |
| 8 | Beauty & Wellness | sparkles | Salons, spas, gyms, yoga studios, therapists |
| 9 | Real Estate | home | Realtors, mortgage brokers, movers, storage |
| 10 | Pet Services | paw-print | Vets, groomers, pet sitters, trainers |
| 11 | Cleaning Services | spray-can | House cleaning, carpet cleaning, pressure washing |
| 12 | Technology | monitor | IT support, computer repair, web designers, phone repair |

---

## 13. Future Roadmap

| Phase | Features |
|---|---|
| **Phase 2** | Push notifications, admin dashboard, Google Maps integration |
| **Phase 3** | WhatsApp bot for real-time capture, blog/content section |
| **Phase 4** | App Store / Google Play publication |
| **Phase 5** | Featured listings (monetization), analytics dashboard |
