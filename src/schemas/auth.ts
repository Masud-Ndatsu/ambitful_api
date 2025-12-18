import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

// Inferred types from schemas
export type RegisterData = z.infer<typeof registerSchema>;
export type LoginCredentials = z.infer<typeof loginSchema>;

export interface AuthTokens {
  accessToken: string;
  user: {
    id: string;
    email: string;
    name: string;
    isEmailVerified: boolean;
  };
}
