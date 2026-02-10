import prisma from "@/db";
import { AppError } from "@/middleware/errorHandler";


export const mediaService = {
  async createMedia(data: any) {
    try {
      const newMedia = await prisma.media.create({ data });
      return newMedia;
    } catch (error) {
      console.error('Error creating media:', error);
      throw new AppError('Failed to create media', 500);
    }
  },

  // Additional media-related service methods can be added here
};