import type { Context } from 'hono';
import { getUserHomeInfo, searchRoute } from './home.service.js';
import { successResponse, errorResponse } from '../../utils/response.js';
import { z } from 'zod';

export async function getUserInfoController(c: Context) {
  try {
    const userId = c.get('userId') as string;
    const data = await getUserHomeInfo(userId);
    return successResponse(c, data);
  } catch (err) {
    console.error('[home/user-info]', err);
    return errorResponse(c, 'Failed to fetch home data', 500);
  }
}

const searchSchema = z.object({
  from: z.string().min(2),
  to: z.string().min(2),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  time: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be HH:MM'),
});

export async function searchController(c: Context) {
  try {
    const body = await c.req.json();
    const parsed = searchSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(c, parsed.error.flatten().fieldErrors as unknown as string, 422);
    }
    const { from, to, date, time } = parsed.data;
    const result = await searchRoute(from, to, date, time);
    return successResponse(c, result);
  } catch (err) {
    console.error('[home/search]', err);
    return errorResponse(c, 'Search failed', 500);
  }
}
