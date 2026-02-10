import type { User } from "@/generated/prisma/client";

export type PublicUser = Omit<User, "emailVerified">;

export type ListQuery = {
  page?: number;
  pageSize?: number;
  type?: string;
  tag?: string;
  tags?: string;
  platform?: string;
  platforms?: string;
  q?: string;
  sort?: 'createdAt' | 'title' | 'releaseDate';
  order?: 'asc' | 'desc';
  cursor?: string;
};

export type MediaWhereClause = Omit<ListQuery, 'page' | 'pageSize' | 'sort' | 'order' | 'cursor'>;

export type PaginationLinks = {
  self: string;
  next: string | null;
  prev: string | null;
}

export type PaginatedData<T> = {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
  pages: number;
  links: PaginationLinks;
}
