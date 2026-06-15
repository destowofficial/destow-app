import type { Context } from 'hono';
import { getHistory } from './history.service.js';
import { successResponse, errorResponse } from '../../utils/response.js';

export async function historyController(c: Context) {
  try {
    const userId = c.get('userId') as string;
    const page = parseInt(c.req.query('page') ?? '1');
    const limit = parseInt(c.req.query('limit') ?? '10');
    const status = c.req.query('status'); // optional filter

    if (page < 1 || limit < 1 || limit > 50) {
      return errorResponse(c, 'Invalid pagination parameters', 422);
    }

    const data = await getHistory(userId, page, limit, status);
    return successResponse(c, data);
  } catch (err) {
    console.error('[history GET]', err);
    return errorResponse(c, 'Failed to fetch history', 500);
  }
}
