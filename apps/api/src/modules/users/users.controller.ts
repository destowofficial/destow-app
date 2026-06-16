import type { Context } from 'hono';
import { z } from 'zod';
import { getUserById, updateUser } from './users.service.js';
import { successResponse } from '../../utils/response.js';
import { parseJsonBody } from '../../lib/validate.js';
import { AppError } from '../../lib/errors.js';

export async function getMeController(c: Context) {
  const userId = c.get('userId') as string;
  const user = await getUserById(userId);
  if (!user) throw AppError.notFound('User not found');
  return successResponse(c, { user });
}

const updateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  avatarUrl: z.string().url().optional(),
});

export async function updateMeController(c: Context) {
  const userId = c.get('userId') as string;
  const data = await parseJsonBody(c, updateUserSchema);
  const updated = await updateUser(userId, data);
  if (!updated) throw AppError.notFound('User not found');
  return successResponse(c, { user: updated });
}
