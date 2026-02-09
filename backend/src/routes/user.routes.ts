import { Hono } from 'hono';
import type { AuthType } from '@/middleware/auth';

export const userRoutes = new Hono<{ Variables: AuthType }>();

userRoutes.get('/profile', async (c) => {
  const user = c.get('user');
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  return c.json({ user });
});