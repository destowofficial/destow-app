import express from 'express';
import { paymentWebhookController } from '../controllers/webhooks/webhooks.controller.js';
import { rateLimit } from '../middleware/ratelimit/ratelimit.js';

export const webhooksRouter: express.Router = express.Router();

// Public by necessity - the gateway has no credentials of ours. The HMAC over
// the raw body is what authenticates it, so an unsigned call gets nowhere. The
// limiter is a flood guard on a public endpoint, set well above any real
// gateway's retry rate.
const webhookLimiter = rateLimit({ keyPrefix: 'webhook', max: 600, windowSec: 3600 });

webhooksRouter.post('/payments', webhookLimiter, paymentWebhookController);
