import { z } from 'zod';

export const createOpportunitySchema = z.object({
  title: z.string().min(1, 'Title is required'),
  organization: z.string().min(1, 'Organization is required'),
  description: z.string().min(1, 'Description is required'),
  requirements: z
    .array(z.string())
    .min(1, 'At least one requirement is needed'),
  benefits: z.array(z.string()).default([]),
  compensation: z.string().optional(),
  compensationType: z
    .enum(['salary', 'stipend', 'scholarship_amount', 'hourly', 'volunteer'])
    .optional(),
  locations: z.array(z.string()).min(1, 'At least one location is required'),
  isRemote: z.boolean().default(false),
  deadline: z.iso.datetime('Invalid deadline format'),
  applicationUrl: z.string().url('Invalid application URL').optional(),
  contactEmail: z.string().email('Invalid contact email').optional(),
  experienceLevel: z.string().optional(),
  duration: z.string().optional(),
  eligibility: z.array(z.string()).default([]),
  opportunityTypeIds: z
    .array(z.string())
    .min(1, 'At least one opportunity type is required'),
  author: z.string().optional(),
});

export const updateOpportunitySchema = createOpportunitySchema
  .partial()
  .extend({
    isActive: z.boolean().optional(),
  });

export const opportunityQuerySchema = z.object({
  page: z
    .string()
    .transform((val) => parseInt(val) || 1)
    .pipe(z.number().min(1)),
  limit: z
    .string()
    .transform((val) => parseInt(val) || 10)
    .pipe(z.number().min(1).max(100)),
  search: z.string().optional(),
  locations: z.string().optional(), // comma-separated
  isRemote: z
    .string()
    .transform((val) => val === 'true')
    .pipe(z.boolean())
    .optional(),
  experienceLevel: z
    .enum(['entry', 'mid', 'senior', 'executive', 'internship', 'any'])
    .optional(),
  compensationType: z
    .enum(['salary', 'stipend', 'scholarship_amount', 'hourly', 'volunteer'])
    .optional(),
  opportunityTypeIds: z.string().optional(), // comma-separated
  deadline: z.enum(['week', 'month', 'quarter']).optional(),
  sortBy: z
    .enum(['deadline', 'createdAt', 'title', 'organization'])
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const savedJobSchema = z.object({
  opportunityId: z.string().min(1, 'Opportunity ID is required'),
});

export const applicationSchema = z.object({
  opportunityId: z.string().min(1, 'Opportunity ID is required'),
  coverLetter: z.string().optional(),
  resumeUrl: z.string().url('Invalid resume URL').optional(),
});

export const updateApplicationSchema = z.object({
  status: z
    .enum([
      'PENDING',
      'REVIEWING',
      'INTERVIEW',
      'ACCEPTED',
      'REJECTED',
      'WITHDRAWN',
    ])
    .optional(),
  coverLetter: z.string().optional(),
  resumeUrl: z.string().url('Invalid resume URL').optional(),
});

// Inferred types from schemas
export type CreateOpportunityData = z.infer<typeof createOpportunitySchema>;
export type UpdateOpportunityData = z.infer<typeof updateOpportunitySchema>;
export type OpportunityQueryParams = z.infer<typeof opportunityQuerySchema>;
export type SavedJobData = z.infer<typeof savedJobSchema>;
export type ApplicationData = z.infer<typeof applicationSchema>;
export type UpdateApplicationData = z.infer<typeof updateApplicationSchema>;

export interface OpportunityResponse {
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
  author: string | null;
  views: number;
  isActive: boolean;
  applicationUrl: string | null;
  contactEmail: string | null;
  experienceLevel: string | null;
  duration: string | null;
  eligibility: string[];
  createdAt: Date;
  updatedAt: Date;
  opportunityCategories: {
    opportunityType: {
      id: string;
      name: string;
    };
  }[];
  _count?: {
    applications: number;
    savedJobs: number;
  };
}

export interface OpportunityListResponse {
  opportunities: OpportunityResponse[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}
