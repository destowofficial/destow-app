import type { Response } from 'express';

// Standard success envelope: { success: true, data }.
export function ok(res: Response, data: unknown, status = 200) {
  res.status(status).json({ success: true, data });
}
