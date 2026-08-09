import type { Request, Response } from 'express';
import { searchBody, availableVehiclesBody } from '@destow/contracts';
import {
  searchRoute,
  listAvailableVehicles,
  listVehicleTypes,
  listCities,
  listPopularRoutes,
} from '../../services/search/search.service.js';
import { parseOrThrow } from '../../lib/http/validate.js';
import { ok } from '../../lib/http/response.js';

export async function searchController(req: Request, res: Response) {
  const { from, to } = parseOrThrow(searchBody, req.body);
  ok(res, { route: await searchRoute(from, to) });
}

export async function availableVehiclesController(req: Request, res: Response) {
  const { from, to, category } = parseOrThrow(availableVehiclesBody, req.body);
  // Pass the cap through. The service counts the true total separately so a
  // truncated list is visible rather than silently passed off as everything -
  // reporting vehicles.length as the count undid exactly that.
  ok(res, await listAvailableVehicles(from, to, category));
}

export async function vehicleTypesController(_req: Request, res: Response) {
  ok(res, { vehicleTypes: await listVehicleTypes() });
}

export async function citiesController(_req: Request, res: Response) {
  ok(res, { cities: await listCities() });
}

export async function popularRoutesController(_req: Request, res: Response) {
  ok(res, { routes: await listPopularRoutes() });
}
