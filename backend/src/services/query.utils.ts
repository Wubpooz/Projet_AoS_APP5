import type { Prisma } from "@/generated/prisma/browser";
import { Visibility } from "@/generated/prisma/browser";
import type { ListQuery, PaginationLinks } from "@/types/types";

/**
 * Utility functions for query building, pagination, and data transformation
 */
export const queryUtils = {
  /**
   * Parse comma-separated strings into an array
   * @param {string} [commaSeparated] Comma-separated string to split into array
   * @param {string} [single] Single string value as fallback
   * @returns {string[]} Array of parsed strings
   */
  parseCommaSeparated(commaSeparated?: string, single?: string): string[] {
    if (commaSeparated) {
      return commaSeparated.split(',').map(s => s.trim()).filter(Boolean);
    }
    if (single) {
      return [single];
    }
    return [];
  },

  /**
   * Build pagination links for API responses
   * @param {string} baseUrl Base URL for the API endpoint (e.g., '/api/collections')
   * @param {ListQuery} query Query parameters
   * @param {number} page Current page number
   * @param {number} pageSize Number of items per page
   * @param {number} pages Total number of pages
   * @returns {PaginationLinks} Object containing self, next, and prev links
   */
  buildPaginationLinks(baseUrl: string, query: ListQuery, page: number, pageSize: number, pages: number): PaginationLinks {
    const queryParams = this.buildBaseQueryParams(query);

    const buildLink = (p: number) => {
      const params = new URLSearchParams(queryParams);
      params.set('page', p.toString());
      params.set('pageSize', pageSize.toString());
      return `${baseUrl}?${params.toString()}`;
    };

    return {
      self: buildLink(page),
      next: page < pages ? buildLink(page + 1) : null,
      prev: page > 1 ? buildLink(page - 1) : null,
    };
  },

  /**
   * Build cursor-based pagination links
   * @param {string} baseUrl Base URL for the API endpoint (e.g., '/api/collections')
   * @param {ListQuery} query Query parameters
   * @param {number} pageSize Number of items to fetch
   * @param {string | null} nextCursor Cursor for next page
   * @returns {PaginationLinks} Object containing self and next links
   */
  buildCursorPaginationLinks(baseUrl: string, query: ListQuery, pageSize: number, nextCursor: string | null): PaginationLinks {
    const queryParams = this.buildBaseQueryParams(query);
    queryParams.set('pageSize', pageSize.toString());

    const buildSelfLink = () => {
      const params = new URLSearchParams(queryParams);
      if (query.cursor) params.set('cursor', query.cursor);
      return `${baseUrl}?${params.toString()}`;
    };

    const buildNextLink = () => {
      if (!nextCursor) return null;
      const params = new URLSearchParams(queryParams);
      params.set('cursor', nextCursor);
      return `${baseUrl}?${params.toString()}`;
    };

    return {
      self: buildSelfLink(),
      next: buildNextLink(),
      prev: null,
    };
  },

  /**
   * Build base query parameters from filter query
   * @param {ListQuery} query Query parameters
   * @returns {URLSearchParams} URL search parameters
   */
  buildBaseQueryParams(query: ListQuery): URLSearchParams {
    const queryParams = new URLSearchParams();
    if (query.type) queryParams.set('type', query.type);
    if (query.tag) queryParams.set('tag', query.tag);
    if (query.tags) queryParams.set('tags', query.tags);
    if (query.platform) queryParams.set('platform', query.platform);
    if (query.platforms) queryParams.set('platforms', query.platforms);
    if (query.q) queryParams.set('q', query.q);
    if (query.sort) queryParams.set('sort', query.sort);
    if (query.order) queryParams.set('order', query.order);
    return queryParams;
  },

  /**
   * Build access control where clause for collection visibility
   * @param {string} [userId] Optional user ID for permission checking
   * @returns {Prisma.CollectionWhereInput} Where clause that filters by visibility and user access
   */
  buildCollectionAccessWhere(userId?: string): Prisma.CollectionWhereInput {
    const publicAccess: Prisma.CollectionWhereInput = {
      visibility: Visibility.PUBLIC,
    };

    if (!userId) {
      return publicAccess;
    }

    const memberAccess: Prisma.CollectionWhereInput = {
      OR: [
        { ownerId: userId },
        { members: { some: { userId, accepted: true } } },
      ],
    };

    return { OR: [publicAccess, memberAccess] };
  },

  /**
   * Build access control where clause for media visibility
   * @param {string} [userId] Optional user ID for permission checking
   * @returns {Prisma.MediaWhereInput} Where clause that filters by visibility and user access
   */
  buildMediaAccessWhere(userId?: string): Prisma.MediaWhereInput {
    const publicAccess: Prisma.MediaWhereInput = {
      collections: {
        some: {
          collection: {
            visibility: Visibility.PUBLIC,
          },
        },
      },
    };

    if (!userId) {
      return publicAccess;
    }

    const memberAccess: Prisma.MediaWhereInput = {
      collections: {
        some: {
          collection: {
            OR: [
              { ownerId: userId },
              { members: { some: { userId } } },
            ],
          },
        },
      },
    };

    return { OR: [publicAccess, memberAccess] };
  },
};
