import express from 'express';
import {
  searchController,
  availableVehiclesController,
} from '../controllers/search/search.controller.js';
import { requireAuth } from '../middleware/auth/auth.js';
import { rateLimit } from '../middleware/ratelimit/ratelimit.js';

export const searchRouter: express.Router = express.Router();

// Every quote can cost a billed Distance Matrix call on a cache miss, so this is
// rate limited even though it is authenticated - an authenticated user is still
// capable of running up the maps bill.
const quoteLimiter = rateLimit({ keyPrefix: 'quote', max: 300, windowSec: 3600 });

// requireAuth but deliberately no requireClient: a provider previewing what
// customers see, and an admin investigating a price complaint, are both
// legitimate. There is nothing user-specific in the response to leak.
searchRouter.use(requireAuth, quoteLimiter);

searchRouter.post('/search', searchController);
searchRouter.post('/vehicles/available', availableVehiclesController);
