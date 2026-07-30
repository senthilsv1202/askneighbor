import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import categoriesRouter from './routes/categories.js';
import providersRouter from './routes/providers.js';
import reviewsRouter from './routes/reviews.js';
import favoritesRouter from './routes/favorites.js';
import communitiesRouter from './routes/communities.js';
import invitesRouter from './routes/invites.js';
import parseRouter from './routes/parse.js';
import searchRouter from './routes/search.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Railway terminates TLS and forwards requests, so without this every request
// looks like it came from the proxy: express-rate-limit then applied one shared
// 200-request bucket to the entire community instead of one per client, and logged
// ERR_ERL_UNEXPECTED_X_FORWARDED_FOR. Trust exactly one hop — using `true` would
// let a client spoof X-Forwarded-For and bypass the limit entirely.
app.set('trust proxy', 1);

app.use(helmet());
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173').split(',').map(s => s.trim());
app.use(cors({ origin: allowedOrigins }));
app.use(express.json());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 200 }));

// These two routes each spend an Anthropic API call per request, so they get a
// tighter budget than general browsing to bound both cost and abuse.
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  message: { error: 'Too many AI requests. Please wait a few minutes and try again.' },
});

app.use((req, _res, next) => {
  req.supabase = supabase;
  next();
});

app.use('/api/categories', categoriesRouter);
app.use('/api/providers', providersRouter);
app.use('/api/reviews', reviewsRouter);
app.use('/api/favorites', favoritesRouter);
app.use('/api/communities', communitiesRouter);
app.use('/api/invites', invitesRouter);
app.use('/api/parse', aiLimiter, parseRouter);
app.use('/api/search', aiLimiter, searchRouter);

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => console.log(`AskNeighbor API running on port ${PORT}`));
