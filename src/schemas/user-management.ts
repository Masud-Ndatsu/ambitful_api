import { z } from 'zod';

export const userQueryParamsSchema = z.object({
  page: z.string()
    .optional()
    .transform(val => val ? parseInt(val, 10) : 1)
    .pipe(z.number().min(1)),
  limit: z.string()
    .optional()
    .transform(val => val ? parseInt(val, 10) : 10)
    .pipe(z.number().min(1).max(100)),
  search: z.string().optional(),
  role: z.enum(['ADMIN', 'MODERATOR', 'USER']).optional(),
  isEmailVerified: z.string()
    .optional()
    .transform(val => val === 'true' ? true : val === 'false' ? false : undefined)
    .pipe(z.boolean().optional()),
  isOnboardingComplete: z.string()
    .optional()
    .transform(val => val === 'true' ? true : val === 'false' ? false : undefined)
    .pipe(z.boolean().optional()),
});

export const createUserSchema = z.object({
  email: z.string().email('Invalid email format'),
  name: z.string().min(1, 'Name is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  phone: z.string().optional(),
  role: z.enum(['ADMIN', 'MODERATOR', 'USER']).default('USER'),
});

export const updateUserSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  phone: z.string().optional(),
  role: z.enum(['ADMIN', 'MODERATOR', 'USER']).optional(),
  isEmailVerified: z.boolean().optional(),
});

export type UserQueryParams = z.infer<typeof userQueryParamsSchema>;
export type CreateUserData = z.infer<typeof createUserSchema>;
export type UpdateUserData = z.infer<typeof updateUserSchema>;

export interface UserResponse {
  id: string;
  email: string;
  name: string;
  phone?: string;
  avatar?: string;
  role: 'ADMIN' | 'MODERATOR' | 'USER';
  isEmailVerified: boolean;
  jobFunction?: string;
  preferredLocations?: string[];
  workAuthorization?: string;
  remoteWork?: boolean;
  resumeUrl?: string;
  isOnboardingComplete: boolean;
  onboardingCompletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserListResponse {
  users: UserResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}