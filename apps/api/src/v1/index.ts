import express, { Router } from 'express';
import { authRouter } from './auth.route.js';

// v1 API. Every v1 feature module is mounted here; mounted by the app at /api/v1.
// A future v2 lives in src/v2/ and mounts at /api/v2.
export const v1Router: express.Router = Router();

v1Router.use('/auth', authRouter);
