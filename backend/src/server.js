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

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));
app.use(express.json());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 200 }));

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
app.use('/api/parse', parseRouter);

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => console.log(`AskNeighbor API running on port ${PORT}`));
