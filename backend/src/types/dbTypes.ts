import type { User } from "../generated/prisma/client";

/**
 * User record from database
 */
export type DbUser = User;

/**
 * Fields that can be updated on a user
 */
export type DbUserUpdateInput = Partial<
  Pick<User, "name" | "image" | "username" | "displayUsername">
>;

/**
 * Public-facing user data (excludes sensitive fields)
 */
export type PublicUser = Omit<User, "emailVerified">;
