import prisma from "../db";
import type { DbUser, DbUserUpdateInput, PublicUser } from "../types/dbTypes";

/**
 * Converts a database user record to a public user object
 */
const toPublicUser = (user: DbUser): PublicUser => {
  const { emailVerified, ...publicFields } = user;
  return publicFields;
};

export const userService = {
  async getById(id: string): Promise<PublicUser | null> {
    const user = await prisma.user.findUnique({ where: { id } });
    return user ? toPublicUser(user) : null;
  },

  //TODO shouldn't edit anything related to auth (email, password, username etc) since better-auth manages that
  async updateById(
    id: string,
    data: DbUserUpdateInput
  ): Promise<PublicUser> {
    const user = await prisma.user.update({ where: { id }, data });
    return toPublicUser(user);
  },
};
