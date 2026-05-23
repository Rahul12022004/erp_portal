import { Types } from "mongoose";
import type { Router } from "express";

export type ObjectId = Types.ObjectId;

export interface PaginationQuery {
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface RouteEntry {
  path: string;
  router: Router;
  skipAuth?: boolean;
}
