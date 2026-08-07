import type { UserRole, Client } from '@destow/contracts';

// Augment Express Request with the authenticated user set by requireAuth.
declare global {
  namespace Express {
    interface Request {
      userId?: string;
      sessionId?: string; // sid claim from the access token (set by requireAuth)
      user?: { id: string; role: UserRole; client: Client };
    }
  }
}

export {};
