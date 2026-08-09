import express from 'express';
import {
  createBookingController,
  listBookingsController,
  getBookingController,
  cancelBookingController,
  cancellationPreviewController,
  startQrPaymentController,
  paymentStatusController,
  rateBookingController,
  getRatingController,
} from '../controllers/bookings/bookings.controller.js';
import { requireAuth, requireRole, requireClient } from '../middleware/auth/auth.js';

export const bookingsRouter: express.Router = express.Router();

// A booking belongs to a customer, so this is the one place both gates apply:
// only a customer role, and only from the customer app. A partner has their own
// queue; an admin has reports. Neither books a trip for themselves here.
bookingsRouter.use(requireAuth, requireRole('customer'), requireClient('customer_app'));

bookingsRouter.post('/', createBookingController);
bookingsRouter.get('/', listBookingsController);
bookingsRouter.get('/:id', getBookingController);
bookingsRouter.get('/:id/cancellation', cancellationPreviewController);
bookingsRouter.post('/:id/cancel', cancelBookingController);

// A QR raised for exactly what this trip cost, then polled while the customer
// pays. Settlement arrives on the webhook, never from the client.
bookingsRouter.post('/:id/pay/qr', startQrPaymentController);
bookingsRouter.get('/:id/pay/status', paymentStatusController);

// One rating per completed trip. Feeds the provider average the search listing
// already shows.
bookingsRouter.post('/:id/rating', rateBookingController);
bookingsRouter.get('/:id/rating', getRatingController);
