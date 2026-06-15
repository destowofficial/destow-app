import { Hono } from 'hono';
import { authMiddleware } from '../../middleware/auth.middleware.js';
import { getMeController, updateMeController } from './users.controller.js';

export const usersRoutes = new Hono();

usersRoutes.use('*', authMiddleware);

/**
 * GET /api/v1/users/me
 * Returns the authenticated user's full profile.
 */
usersRoutes.get('/me', getMeController);

/**
 * PUT /api/v1/users/me
 * Body: { name?: string, avatarUrl?: string }
 * Updates the authenticated user's profile.
 */
usersRoutes.put('/me', updateMeController);
