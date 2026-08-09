import express from 'express';
import {
  searchController,
  availableVehiclesController,
  vehicleTypesController,
  citiesController,
  popularRoutesController,
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

// The catalog a partner lists against and a customer filters by. No maps call,
// so it sits outside the quote limiter's purpose but harmlessly inside it.
searchRouter.get('/vehicle-types', vehicleTypesController);

// The home screen's two lists: where you can go, and where people are going.
// Neither calls the maps provider, so neither costs anything per request.
searchRouter.get('/cities', citiesController);
searchRouter.get('/routes/popular', popularRoutesController);
