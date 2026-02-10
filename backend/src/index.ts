import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { csrf } from 'hono/csrf';
import { requestId } from 'hono/request-id';
import { requestLogger } from './middleware/requestLogger';
import { openAPIRouteHandler } from 'hono-openapi';
import { swaggerUI } from '@hono/swagger-ui';

import { auth, type AuthType } from "./middleware/auth";
import { errorHandler } from './middleware/errorHandler';
import prisma from './db/index';

import { authRoutes } from './routes/auth.routes.ts';
import { userRoutes } from './routes/user.routes';



export const PORT = process.env.PORT || 3000;

// ==================== Initialize Hono app ====================
const app = new Hono<{ Variables: AuthType }>();
export default app;


app.use("*", async (c, next) => {
  // When both Authorization and Cookie are present, better-auth fails to parse correctly
  // Prefer Authorization header (bearer token) over cookie when both are present
  const authorizationHeader = c.req.header('authorization');
  
  let session;
  if (authorizationHeader?.startsWith('Bearer ')) {
    // Bearer auth: create Headers with ONLY authorization header
    const headers = new Headers();
    headers.set('authorization', authorizationHeader);
    
    session = await auth.api.getSession({
      headers: headers,
    });
  } else {
    // Cookie auth: use raw headers (includes cookies)
    session = await auth.api.getSession({
      headers: c.req.raw.headers,
    });
  }

  if (!session) {
    c.set("user", null);
    c.set("session", null);
    await next();
    return;
  }

  c.set("user", session.user);
  c.set("session", session.session);
  await next();
});

// ==================== Security configurations ====================
app.use(
	"*", // CORS enabled for all routes (required for Swagger UI)
	cors({
		origin: "http://localhost:3000",
		allowHeaders: ["Content-Type", "Authorization"],
		allowMethods: ["POST", "GET", "PATCH", "DELETE", "OPTIONS"],
		exposeHeaders: ["Content-Length", "set-auth-token"],
		maxAge: 600,
		credentials: true
	})
);

// CSRF protection - disabled for Swagger UI in development
if (process.env.NODE_ENV === 'production') {
  app.use(csrf({
    origin: ["http://localhost:3000"],
    secFetchSite: ['same-origin', 'same-site']
  }));
}


// Rate limiting
// app.use(standardRateLimiter);


// Request ID and logging
app.use('*', requestId());
app.use('*', requestLogger);


// ==================== Routes ====================
const rootHandler = (c: any) => {
  return c.json({
    name: 'Media Collection API',
    version: '1.0.0',
    docs: '/openapi',
    status: 'ok',
    message: 'Welcome to the Media Collection API!',
  }, 200);
};

app.all('/', rootHandler);
app.all('/api', rootHandler);


app.get(
  '/openapi',
  openAPIRouteHandler(app, {
    documentation: {
      info: {
        title: 'Media Collection API',
        version: '1.0.0',
        description: 'A simple API for managing a media collection (movies, TV shows, books, etc.)',
      },
      servers: [
        { url: 'http://localhost:3000', description: 'Local Server' },
      ],
      tags: [
        { name: 'Auth', description: 'Authentication endpoints' },
        { name: 'Users', description: 'User profile endpoints' },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            description: 'Session token obtained from login response (set-auth-token header or sessionToken field)',
          },
          sessionCookie: {
            type: 'apiKey',
            in: 'cookie',
            name: 'better-auth.session_token',
            description: 'Better-Auth session cookie (set automatically by browser)',
          },
        },
      },
      security: [
        { bearerAuth: [] },
      ],
    },
    includeEmptyPaths: true,
  })
);

app.get(
  '/docs',
  swaggerUI({
    url: '/openapi',
    title: 'Media Collection API Docs',
    withCredentials: true,
  })
);

app.get('/health', async (c) => {
  const timestamp = new Date().toISOString();
  let dbConnection = 'disconnected';

  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`;
    dbConnection = 'connected';
  } catch (error) {
    console.error('Database health check failed:', error);
    dbConnection = 'error';
  }

  return c.json({
    status: 'ok',
    timestamp,
    uptime: process.uptime(),
    requestId: c.get('requestId'),
    dbConnection,
  }, 200);
});


app.route('/api/auth', authRoutes);
app.route('/api/users', userRoutes);

// Better-Auth handler for built-in endpoints (OAuth, etc.)
// Mounted after custom routes - use catch-all for anything not matched above
app.all("/api/auth/*", (c) => {
	return auth.handler(c.req.raw);
});


// 404 handler
app.notFound((c) => {
  return c.json({
    error: 'Not Found',
    message: `Route ${c.req.method} ${c.req.path} not found`,
  }, 404);
});


// Error handling middleware
app.onError(errorHandler);




// ==================== Start server ====================
if (import.meta.main) {
  const server = Bun.serve({
    port: Number(PORT),
    fetch: app.fetch,
  });
  console.log(`🚀 Backend server running on port ${server.port}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.stop();
    console.log('HTTP server closed');
    process.exit(0);
  });
}