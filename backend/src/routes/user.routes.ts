import { Hono } from 'hono';
import { z } from 'zod';
import type { AuthType } from '@/middleware/auth';
import { userService } from '@/services/user.service';

export const userRoutes = new Hono<{ Variables: AuthType }>();

const updateUserSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  image: z
    .string()
    .min(1)
    .refine((value) => {
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    }, { message: 'Invalid URL' })
    .optional(),
  username: z.string().min(2).max(40).optional(),
  displayUsername: z.string().min(2).max(60).optional(),
});

userRoutes.get('/profile', async (c) => {
  const sessionUser = c.get('user');
  if (!sessionUser) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const user = await userService.getById(sessionUser.id);
  if (!user) {
    return c.json({ error: 'User not found' }, 404);
  }

  return c.json({ user });
});

userRoutes.get('/:id', async (c) => {
  const id = c.req.param('id');
  const user = await userService.getById(id);

  if (!user) {
    return c.json({ error: 'User not found' }, 404);
  }

  return c.json({ user });
});

userRoutes.patch('/profile', async (c) => {
  const sessionUser = c.get('user');
  if (!sessionUser) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  if (!c.req.raw.headers.get('Content-Type')?.includes('application/json')) {
    return c.json({ error: 'Content-Type must be application/json' }, 400);
  }

  const body = await c.req.json().catch(() => null);
  const parsed = updateUserSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Invalid payload', details: parsed.error.issues }, 400);
  }

  const data = parsed.data;
  if (Object.keys(data).length === 0) {
    return c.json({ error: 'No fields to update' }, 400);
  }

  const user = await userService.updateById(sessionUser.id, data);
  return c.json({ user });
});