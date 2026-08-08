import type { Request, Response } from 'express';
import { searchBody, availableVehiclesBody } from '@destow/contracts';
import { searchRoute, listAvailableVehicles } from '../../services/search/search.service.js';
import { parseOrThrow } from '../../lib/http/validate.js';
import { ok } from '../../lib/http/response.js';

export async function searchController(req: Request, res: Response) {
  const { from, to } = parseOrThrow(searchBody, req.body);
  ok(res, { route: await searchRoute(from, to) });
}

export async function availableVehiclesController(req: Request, res: Response) {
  const { from, to, category } = parseOrThrow(availableVehiclesBody, req.body);
  const { route, vehicles } = await listAvailableVehicles(from, to, category);
  ok(res, { route, vehicles, count: vehicles.length });
}
