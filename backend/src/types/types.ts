import type { User } from "@/generated/prisma/client";

export type PublicUser = Omit<User, "emailVerified">;