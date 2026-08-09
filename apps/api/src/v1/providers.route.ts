import express from 'express';
import {
  registerProviderController,
  getMyProviderController,
} from '../controllers/providers/providers.controller.js';
import {
  listVehiclesController,
  createVehicleController,
  updateVehicleController,
  listDriversController,
  createDriverController,
  updateDriverController,
} from '../controllers/providers/fleet.controller.js';
import {
  listProviderBookingsController,
  acceptBookingController,
  rejectBookingController,
  assignDriverController,
  startTripController,
  completeTripController,
  cashCollectedController,
  earningsController,
} from '../controllers/providers/fulfilment.controller.js';
import { requireAuth, requireRole } from '../middleware/auth/auth.js';

export const providersRouter: express.Router = express.Router();

providersRouter.use(requireAuth);

// Registration is deliberately NOT gated by requireRole('provider') or by
// requireClient: the caller is still a customer at this point, signed in through
// the customer app. Requiring the provider role here would be a chicken-and-egg
// - you could only become a provider if you already were one.
providersRouter.post('/register', registerProviderController);

// Everything below is for an established partner, so both gates apply.
providersRouter.get('/me', requireRole('provider'), getMyProviderController);

// --- Fleet and roster ---------------------------------------------------------
// Everything below is the caller's own. No route takes a provider id: it is
// resolved from the token, so there is no parameter to tamper with.
const partnerOnly = requireRole('provider');

providersRouter.get('/vehicles', partnerOnly, listVehiclesController);
providersRouter.post('/vehicles', partnerOnly, createVehicleController);
providersRouter.patch('/vehicles/:id', partnerOnly, updateVehicleController);

providersRouter.get('/drivers', partnerOnly, listDriversController);
providersRouter.post('/drivers', partnerOnly, createDriverController);
providersRouter.patch('/drivers/:id', partnerOnly, updateDriverController);

// --- Booking lifecycle --------------------------------------------------------
// Every transition is gated by the state machine in lib/bookings/lifecycle, and
// scoped to the caller's own provider by the query rather than by a check.
providersRouter.get('/bookings', partnerOnly, listProviderBookingsController);
providersRouter.post('/bookings/:id/accept', partnerOnly, acceptBookingController);
providersRouter.post('/bookings/:id/reject', partnerOnly, rejectBookingController);
providersRouter.post('/bookings/:id/assign', partnerOnly, assignDriverController);
providersRouter.post('/bookings/:id/start', partnerOnly, startTripController);
providersRouter.post('/bookings/:id/complete', partnerOnly, completeTripController);
// Cash handed over at the roadside. The driver confirms it because they are the
// one holding it - a customer must not be able to close a trip they never paid.
providersRouter.post('/bookings/:id/cash-collected', partnerOnly, cashCollectedController);

// Gross, commission deducted, and what is actually payable.
providersRouter.get('/earnings', partnerOnly, earningsController);
