import { betterAuth } from "better-auth";
import { prismaAdapter } from 'better-auth/adapters/prisma';

import prisma from '../db/index';
import env from '../../conf/env';

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  trustedOrigins: [env.FRONTEND_URL], // frontend
  emailAndPassword: { 
    enabled: true, 
  }, 
  socialProviders: { 
    github: { 
      clientId: env.GITHUB_CLIENT_ID,
      clientSecret: env.GITHUB_CLIENT_SECRET,
    },
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    },
  }, 
  advanced: {
    defaultCookieAttributes: {
      sameSite: "none",
      secure: true,
      partitioned: true // New browser standards will mandate this for foreign cookies
    }
  }
});


export type AuthType = {
  user: typeof auth.$Infer.Session.user | null
  session: typeof auth.$Infer.Session.session | null
}