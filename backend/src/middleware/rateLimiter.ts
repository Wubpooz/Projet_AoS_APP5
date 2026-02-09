// import { rateLimiter } from 'hono-rate-limiter';
// import type { Store } from 'hono-rate-limiter';
// import { RedisStore } from '@hono-rate-limiter/redis';
// import type { RedisClientType } from 'redis';
// import { createClient } from 'redis';


// // Create Redis client only if REDIS_URL is configured
// let store: Store | undefined;
// let redisClient: RedisClientType | undefined;

// const initRedisStore = async (): Promise<Store | undefined> => {
//   if (!process.env.REDIS_URL) {
//     console.warn('REDIS_URL not configured, using in-memory rate limiting store');
//     return undefined;
//   }

//   try {
//     redisClient = createClient({
//       url: process.env.REDIS_URL,
//     });

//     await redisClient.connect();
//     console.info('Redis connected for rate limiting');

//     return new RedisStore({
//       client: redisClient,
//       prefix: 'rl:',
//     });
//   } catch (err) {
//     console.error('Failed to connect to Redis for rate limiting, falling back to in-memory store', err);
//     return undefined;
//   }
// };

// // Initialize Redis store
// const redisStorePromise = initRedisStore().then((redisStore) => {
//   store = redisStore;
//   return redisStore;
// });

// export const standardRateLimiter = rateLimiter({
//   keyGenerator: (c: any) => c.req.header("x-forwarded-for") ?? "unknown",
//   store,
//   // Don't use store initially - let it fall back to in-memory
//   // The store will be set after Redis connects
//   windowMs: process.env.RATE_LIMIT_WINDOW_MS
//     ? Number(process.env.RATE_LIMIT_WINDOW_MS)
//     : 60000, // 1 minute

//   limit: process.env.RATE_LIMIT_MAX_REQUESTS
//     ? Number(process.env.RATE_LIMIT_MAX_REQUESTS)
//     : 100,

//   message: {
//     error: 'Too many requests from this IP, please try again later.'
//   },

//   standardHeaders: true
// });


// // Stricter rate limiter for auth endpoints
// export const authRateLimiter = rateLimiter({
//   keyGenerator: (c: any) => c.req.header("x-forwarded-for") ?? "unknown",
//   // Don't use store initially - let it fall back to in-memory
//   windowMs: process.env.RATE_LIMIT_WINDOW_MS_AUTH
//     ? Number(process.env.RATE_LIMIT_WINDOW_MS_AUTH)
//     : 600000, // 10 minutes

//   limit: process.env.RATE_LIMIT_MAX_REQUESTS_AUTH
//     ? Number(process.env.RATE_LIMIT_MAX_REQUESTS_AUTH)
//     : 5,

//   message: {
//     error: 'Too many authentication attempts, please try again later.',
//   },
//   standardHeaders: true
// });

// // Export promise for tests that need to wait for Redis
// export { redisStorePromise };