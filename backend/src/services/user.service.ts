import prisma from "../db";
import type { User, Prisma, Collection } from "@/generated/prisma/client";
import type { PublicUser } from "@/types/types";

/**
 * Converts a database user record to a public user object
 * @param {User} user Database user record
 * @returns {PublicUser} Public user object with sensitive fields removed
 */
const toPublicUser = (user: User): PublicUser => {
  const { emailVerified, ...publicFields } = user;
  return publicFields;
};

export const userService = {

  /**
   * Fetch a public user profile by user ID
   * @param {string} id User ID
   * @returns {PublicUser | null} Public user object or null if not found
   * @throws AppError if fetching user fails
   */
  async getById(id: string): Promise<PublicUser | null> {
    const user = await prisma.user.findUnique({ where: { id } });
    return user ? toPublicUser(user) : null;
  },

  //TODO shouldn't edit anything related to auth (email, password, username etc) since better-auth manages that
  /**
   * Update a user's profile information (name, image, username, displayUsername)
   * Only updates fields that are provided in the data object
   * @param {string} id User ID
   * @param {Prisma.UserUpdateInput} data Fields to update (name, image, username, displayUsername)
   * @returns {PublicUser} Updated public user object
   * @throws AppError if update fails
   */
  async updateById(id: string, data: Prisma.UserUpdateInput): Promise<PublicUser> {
    const user = await prisma.user.update({ where: { id }, data });
    return toPublicUser(user);
  },

  /**
   * Fetch public collections for a user by user ID
   * @param {string} userId User ID
   * @returns {Collection[]} Array of public collections
   * @throws AppError if fetching collections fails
   */
  async getPublicCollections(userId: string): Promise<Collection[]> {
    const collections = await prisma.collection.findMany({
      where: {
        ownerId: userId,
        visibility: "PUBLIC",
      },
      include: {
        _count: {
          select: {
            media: true,
          },
        },
      },
    });
    return collections;
  },
};
