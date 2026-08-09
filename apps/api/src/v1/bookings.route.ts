import express from 'express';
import {
  createBookingController,
  listBookingsController,
  getBookingController,
  cancelBookingController,
  confirmDistanceController,
  cancellationPreviewController,
  startPaymentController,
  confirmPaymentController,
  rateBookingController,
  getRatingController,
} from '../controllers/bookings/bookings.controller.js';
import {
  setupMandateController,
  confirmMandateController,
  listPaymentMethodsController,
  revokeMandateController,
} from '../controllers/bookings/mandates.controller.js';
import { requireAuth, requireRole, requireClient } from '../middleware/auth/auth.js';

export const bookingsRouter: express.Router = express.Router();

// A booking belongs to a customer, so this is the one place both gates apply:
// only a customer role, and only from the customer app. A partner has their own
// queue; an admin has reports. Neither books a trip for themselves here.
bookingsRouter.use(requireAuth, requireRole('customer'), requireClient('customer_app'));

// --- Payment methods -------------------------------------------------------
// Standing permission to charge after a trip - the thing that makes billing
// after the fact collectable at all.
//
// Registered before '/:id' deliberately: Express matches in order, so a param
// route declared first would swallow '/payment-methods' and try to read it as a
// booking id.
bookingsRouter.post('/payment-methods', setupMandateController);
bookingsRouter.post('/payment-methods/confirm', confirmMandateController);
bookingsRouter.get('/payment-methods', listPaymentMethodsController);
bookingsRouter.delete('/payment-methods/:id', revokeMandateController);

bookingsRouter.post('/', createBookingController);
bookingsRouter.get('/', listBookingsController);
bookingsRouter.get('/:id', getBookingController);
bookingsRouter.get('/:id/cancellation', cancellationPreviewController);
bookingsRouter.post('/:id/cancel', cancelBookingController);

// The gate between "the driver says" and "the card is charged". Customer-only
// by virtue of this router's auth, which is the whole point of the step.
bookingsRouter.post('/:id/confirm-distance', confirmDistanceController);

// Pay opens (or reuses) a gateway order; confirm settles it against a signature
// the gateway produced. The amount is never in either request.
bookingsRouter.post('/:id/pay', startPaymentController);
bookingsRouter.post('/:id/pay/confirm', confirmPaymentController);

// One rating per completed trip. Feeds the provider average the search listing
// already shows.
bookingsRouter.post('/:id/rating', rateBookingController);
bookingsRouter.get('/:id/rating', getRatingController);
