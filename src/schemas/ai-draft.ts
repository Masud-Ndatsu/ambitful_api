import { z } from 'zod';

export const createAIDraftSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  organization: z.string().min(1, 'Organization is required'),
  description: z.string().min(1, 'Description is required'),
  requirements: z.array(z.string()).default([]),
  benefits: z.array(z.string()).default([]),
  compensation: z.string().optional(),
  compensationType: z
    .enum(['salary', 'stipend', 'scholarship_amount', 'hourly', 'volunteer'])
    .optional(),
  locations: z.array(z.string()).min(1, 'At least one location is required'),
  isRemote: z.boolean().default(false),
  deadline: z.coerce.date(),
  applicationUrl: z.string().url('Invalid application URL').optional(),
  contactEmail: z.string().email('Invalid contact email').optional(),
  experienceLevel: z
    .enum(['entry', 'mid', 'senior', 'executive', 'internship', 'any'])
    .optional(),
  duration: z.string().optional(),
  eligibility: z.array(z.string()).default([]),
  crawlSourceId: z.string().min(1, 'Crawl source ID is required'),
  sourceUrl: z.string().url('Invalid source URL'),
  rawData: z.string().optional(),
});

export const updateAIDraftSchema = createAIDraftSchema.partial();

export const aiDraftQuerySchema = z.object({
  page: z
    .string()
    .default('1')
    .transform((val) => parseInt(val) || 1)
    .pipe(z.number().min(1)),
  limit: z
    .string()
    .default('10')
    .transform((val) => parseInt(val) || 10)
    .pipe(z.number().min(1).max(100)),
  search: z.string().optional(),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'PUBLISHED']).optional(),
  crawlSourceId: z.string().optional(),
  sortBy: z
    .enum(['createdAt', 'deadline', 'title', 'organization'])
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const reviewAIDraftSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
  rejectionReason: z.string().optional(),
});

export const publishAIDraftSchema = z.object({
  opportunityTypeIds: z
    .array(z.string())
    .min(1, 'At least one opportunity type is required'),
});

// Inferred types from schemas
export type CreateAIDraftData = z.infer<typeof createAIDraftSchema>;
export type UpdateAIDraftData = z.infer<typeof updateAIDraftSchema>;
export type AIDraftQueryParams = z.infer<typeof aiDraftQuerySchema>;
export type ReviewAIDraftData = z.infer<typeof reviewAIDraftSchema>;
export type PublishAIDraftData = z.infer<typeof publishAIDraftSchema>;

export interface AIDraftResponse {
  id: string;
  title: string;
  organization: string;
  description: string;
  requirements: string[];
  benefits: string[];
  compensation: string | null;
  compensationType: string | null;
  locations: string[];
  isRemote: boolean;
  deadline: Date;
  applicationUrl: string | null;
  contactEmail: string | null;
  experienceLevel: string | null;
  duration: string | null;
  eligibility: string[];
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PUBLISHED';
  reviewedBy: string | null;
  reviewedAt: Date | null;
  rejectionReason: string | null;
  opportunityId: string | null;
  crawlSourceId: string;
  sourceUrl: string;
  rawData: string | null;
  createdAt: Date;
  updatedAt: Date;
  crawlSource?: {
    id: string;
    name: string;
    url: string;
  };
}

export interface AIDraftListResponse {
  drafts: AIDraftResponse[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export interface AIDraftStatsResponse {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  published: number;
}

