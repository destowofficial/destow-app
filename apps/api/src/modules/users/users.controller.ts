import type { Context } from 'hono';
import { getUserById, updateUser } from './users.service.js';
import { successResponse, errorResponse } from '../../utils/response.js';
import { z } from 'zod';

export async function getMeController(c: Context) {
  try {
    const userId = c.get('userId') as string;
    const user = await getUserById(userId);
    if (!user) return errorResponse(c, 'User not found', 404);
    return successResponse(c, { user });
  } catch (err) {
    console.error('[users/me GET]', err);
    return errorResponse(c, 'Failed to fetch user', 500);
  }
}

const updateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  avatarUrl: z.string().url().optional(),
});

export async function updateMeController(c: Context) {
  try {
    const userId = c.get('userId') as string;
    const body = await c.req.json();
    const parsed = updateUserSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(c, parsed.error.flatten().fieldErrors as unknown as string, 422);
    }

    const updated = await updateUser(userId, parsed.data);
    if (!updated) return errorResponse(c, 'User not found', 404);
    return successResponse(c, { user: updated });
  } catch (err) {
    console.error('[users/me PUT]', err);
    return errorResponse(c, 'Failed to update user', 500);
  }
}
