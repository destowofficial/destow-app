import { Hono } from 'hono';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { getUserInfoController, searchController } from './home.controller.js';

export const homeRoutes = new Hono();

homeRoutes.use('*', authMiddleware);

/**
 * GET /api/v1/home/user-info
 * Returns greeting name and total trip count for the home screen.
 */
homeRoutes.get('/user-info', getUserInfoController);

/**
 * POST /api/v1/home/search
 * Body: { from: string, to: string, date: "YYYY-MM-DD", time: "HH:MM" }
 * Validates the route and returns distance/duration estimate.
 */
homeRoutes.post('/search', searchController);
