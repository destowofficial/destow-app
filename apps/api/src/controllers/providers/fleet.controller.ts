import type { Request, Response } from 'express';
import {
  createVehicleBody,
  updateVehicleBody,
  createDriverBody,
  updateDriverBody,
} from '@destow/contracts';
import {
  listVehicles,
  createVehicle,
  updateVehicle,
  listDrivers,
  createDriver,
  updateDriver,
} from '../../services/providers/fleet.service.js';
import { parseOrThrow, uuidParam } from '../../lib/http/validate.js';
import { ok } from '../../lib/http/response.js';
import { AppError } from '../../lib/http/errors.js';

function callerId(req: Request): string {
  if (!req.userId) throw AppError.unauthorized();
  return req.userId;
}

export async function listVehiclesController(req: Request, res: Response) {
  ok(res, { vehicles: await listVehicles(callerId(req)) });
}

export async function createVehicleController(req: Request, res: Response) {
  const body = parseOrThrow(createVehicleBody, req.body);
  ok(res, { vehicle: await createVehicle(callerId(req), body) }, 201);
}

export async function updateVehicleController(req: Request, res: Response) {
  const body = parseOrThrow(updateVehicleBody, req.body);
  ok(res, { vehicle: await updateVehicle(callerId(req), uuidParam(req.params.id), body) });
}

export async function listDriversController(req: Request, res: Response) {
  ok(res, { drivers: await listDrivers(callerId(req)) });
}

export async function createDriverController(req: Request, res: Response) {
  const body = parseOrThrow(createDriverBody, req.body);
  ok(res, { driver: await createDriver(callerId(req), body) }, 201);
}

export async function updateDriverController(req: Request, res: Response) {
  const body = parseOrThrow(updateDriverBody, req.body);
  ok(res, { driver: await updateDriver(callerId(req), uuidParam(req.params.id), body) });
}
