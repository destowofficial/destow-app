import express from 'express';
import { getMeController, updateMeController } from '../controllers/users/users.controller.js';
import { requireAuth } from '../middleware/auth/auth.js';

// Every route here is the caller's own profile, so requireAuth at the router
// level is the whole authorization story - there is no other user to reach.
// Deliberately not gated by requireClient: a provider and an admin each have a
// profile too, and this is where all three read it.
export const usersRouter: express.Router = express.Router();

usersRouter.use(requireAuth);

usersRouter.get('/me', getMeController);
usersRouter.patch('/me', updateMeController);
