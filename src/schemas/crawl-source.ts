import { z } from 'zod';

export const createCrawlSourceSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  url: z.string().url('Invalid URL'),
  frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']).default('WEEKLY'),
  scraperType: z.enum(['INDEED', 'OPPORTUNITY_FOR_AFRICANS', 'LINKEDIN']).default('OPPORTUNITY_FOR_AFRICANS'),
  cssSelectors: z.string().optional(),
  isDetailsCrawled: z.boolean().default(true),
});

export const updateCrawlSourceSchema = createCrawlSourceSchema.partial().extend({
  status: z.enum(['ACTIVE', 'INACTIVE', 'ERROR']).optional(),
  isActive: z.boolean().optional(),
  lastCrawledAt: z.date().optional(),
  nextCrawlAt: z.date().optional(),
  opportunitiesFound: z.number().optional(),
  errorMessage: z.string().optional(),
});

export const crawlSourceQuerySchema = z.object({
  page: z
    .string()
    .transform((val) => parseInt(val) || 1)
    .pipe(z.number().min(1)),
  limit: z
    .string()
    .transform((val) => parseInt(val) || 10)
    .pipe(z.number().min(1).max(100)),
  search: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'ERROR']).optional(),
  frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']).optional(),
  isActive: z
    .string()
    .transform((val) => val === 'true')
    .pipe(z.boolean())
    .optional(),
});

export const triggerCrawlSchema = z.object({
  crawlSourceId: z.string().min(1, 'Crawl source ID is required'),
});

// Inferred types from schemas
export type CreateCrawlSourceData = z.infer<typeof createCrawlSourceSchema>;
export type UpdateCrawlSourceData = z.infer<typeof updateCrawlSourceSchema>;
export type CrawlSourceQueryParams = z.infer<typeof crawlSourceQuerySchema>;
export type TriggerCrawlData = z.infer<typeof triggerCrawlSchema>;

export interface CrawlSourceResponse {
  id: string;
  name: string;
  url: string;
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  status: 'ACTIVE' | 'INACTIVE' | 'ERROR';
  scraperType: 'INDEED' | 'OPPORTUNITY_FOR_AFRICANS' | 'LINKEDIN';
  cssSelectors: string | null;
  lastCrawledAt: Date | null;
  nextCrawlAt: Date | null;
  opportunitiesFound: number;
  isActive: boolean;
  isDetailsCrawled: boolean;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CrawlSourceListResponse {
  crawlSources: CrawlSourceResponse[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

