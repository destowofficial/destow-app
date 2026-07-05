import express from 'express';
import { requestOtpController, verifyOtpController } from './auth.controller.js';

export const authRouter: express.Router = express.Router();

authRouter.post('/request-otp', requestOtpController);
authRouter.post('/verify-otp', verifyOtpController);
