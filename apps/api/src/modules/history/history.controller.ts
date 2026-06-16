import type { Context } from 'hono';
import { z } from 'zod';
import { getHistory } from './history.service.js';
import { successResponse } from '../../utils/response.js';
import { parseQuery } from '../../lib/validate.js';
import { BOOKING_STATUS } from '@destow/contracts';

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  status: z.enum(BOOKING_STATUS).optional(),
});

export async function historyController(c: Context) {
  const userId = c.get('userId') as string;
  const { page, limit, status } = parseQuery(c, querySchema);
  return successResponse(c, await getHistory(userId, page, limit, status));
}
