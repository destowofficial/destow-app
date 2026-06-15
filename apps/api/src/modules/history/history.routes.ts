import { Hono } from 'hono';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { historyController } from './history.controller.js';

export const historyRoutes = new Hono();

historyRoutes.use('*', authMiddleware);

/**
 * GET /api/v1/history
 * Query params: page=1, limit=10, status=completed|pending|cancelled
 * Returns paginated booking history for the authenticated user.
 */
historyRoutes.get('/', historyController);
