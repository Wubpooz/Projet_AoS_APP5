import { Hono } from 'hono';
import type { AuthType } from '@/middleware/auth';

export const authRoutes = new Hono<{ Variables: AuthType }>();

authRoutes.post('/login', async (c) => {
  if (!c.req.raw.headers.get('Authorization')) {
    return c.json({ error: 'Missing Authorization header' }, 400);
  }
  if (!c.req.raw.headers.get('Content-Type')?.includes('application/json')) {
    return c.json({ error: 'Content-Type must be application/json' }, 400);
  }

  const user = c.get('user');
  const session = c.get('session');

  if (user) {
    return c.json({ message: 'Already logged in', user, session });
  }

  return c.json({ message: 'Login successful' });
});