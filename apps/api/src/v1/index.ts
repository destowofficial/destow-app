import express, { Router } from 'express';
import { authRouter } from './auth.route.js';
import { usersRouter } from './users.route.js';
import { providersRouter } from './providers.route.js';
import { adminRouter } from './admin.route.js';
import { searchRouter } from './search.route.js';
import { bookingsRouter } from './bookings.route.js';
import { webhooksRouter } from './webhooks.route.js';

// v1 API. Every v1 feature module is mounted here; mounted by the app at /api/v1.
// A future v2 lives in src/v2/ and mounts at /api/v2.
export const v1Router: express.Router = Router();

v1Router.use('/auth', authRouter);
v1Router.use('/users', usersRouter);
v1Router.use('/providers', providersRouter);
v1Router.use('/admin', adminRouter);
// Mounted at the root: /search and /vehicles/available are sibling endpoints,
// not children of one resource.
v1Router.use('/bookings', bookingsRouter);
// Unauthenticated by design: gateways authenticate with a body signature.
v1Router.use('/webhooks', webhooksRouter);
v1Router.use('/', searchRouter);
