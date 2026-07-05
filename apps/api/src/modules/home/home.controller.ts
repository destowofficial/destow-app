import type { Context } from 'hono';
import { z } from 'zod';
import { getUserHomeInfo, searchRoute } from './home.service.js';
import { successResponse } from '../../utils/response.js';
import { parseJsonBody } from '../../lib/validate.js';

export async function getUserInfoController(c: Context) {
  const userId = c.get('userId') as string;
  return successResponse(c, await getUserHomeInfo(userId));
}

const searchSchema = z.object({
  from: z.string().min(2),
  to: z.string().min(2),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  time: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be HH:MM'),
});

export async function searchController(c: Context) {
  const { from, to, date, time } = await parseJsonBody(c, searchSchema);
  return successResponse(c, await searchRoute(from, to, date, time));
}
