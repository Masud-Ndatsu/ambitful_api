export interface AuthUser {
  id: string;
  email: string;
  name: string;
  isEmailVerified: boolean;
}

export interface RequestContext {
  requestId: string;
  userId?: string;
  timestamp: Date;
}

export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}