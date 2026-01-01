import { prisma } from '../config/database';
import logger from '../config/logger';
import {
  CreateCrawlSourceData,
  UpdateCrawlSourceData,
  CrawlSourceQueryParams,
  CrawlSourceResponse,
  CrawlSourceListResponse,
} from '../schemas/crawl-source';
import { NotFoundException, ConflictException } from '../utils/http-exception';
import { crawlQueueService } from './crawl-queue-service';

class CrawlSourceService {
  async createCrawlSource(
    data: CreateCrawlSourceData
  ): Promise<CrawlSourceResponse> {
    const {
      name,
      url,
      frequency,
      scraperType,
      cssSelectors,
      isDetailsCrawled,
    } = data;

    // Check if URL already exists
    const existingSource = await prisma.crawlSource.findFirst({
      where: { url },
    });

    if (existingSource) {
      throw new ConflictException(
        'A crawl source with this URL already exists'
      );
    }

    // Calculate next crawl time based on frequency
    const nextCrawlAt = this.calculateNextCrawlTime(frequency);

    const crawlSource = await prisma.crawlSource.create({
      data: {
        name,
        url,
        frequency,
        scraperType,
        cssSelectors,
        nextCrawlAt,
        status: 'INACTIVE',
        isActive: true,
        isDetailsCrawled: isDetailsCrawled ?? true,
      },
    });

    logger.info('Crawl source created successfully', {
      crawlSourceId: crawlSource.id,
      name: crawlSource.name,
    });

    return crawlSource as CrawlSourceResponse;
  }

  async getCrawlSources(
    filters: CrawlSourceQueryParams
  ): Promise<CrawlSourceListResponse> {
    const { page, limit, search, status, frequency, isActive } = filters;

    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { url: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (frequency) {
      where.frequency = frequency;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const [crawlSources, total] = await Promise.all([
      prisma.crawlSource.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.crawlSource.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    return {
      crawlSources: crawlSources as CrawlSourceResponse[],
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage,
        hasPreviousPage,
      },
    };
  }

  async getCrawlSourceById(id: string): Promise<CrawlSourceResponse> {
    const crawlSource = await prisma.crawlSource.findUnique({
      where: { id },
    });

    if (!crawlSource) {
      throw new NotFoundException('Crawl source not found');
    }

    return crawlSource as CrawlSourceResponse;
  }

  async updateCrawlSource(
    id: string,
    data: UpdateCrawlSourceData
  ): Promise<CrawlSourceResponse> {
    const crawlSource = await prisma.crawlSource.findUnique({
      where: { id },
    });

    if (!crawlSource) {
      throw new NotFoundException('Crawl source not found');
    }

    const updatedCrawlSource = await prisma.crawlSource.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });

    logger.info('Crawl source updated successfully', {
      crawlSourceId: id,
    });

    return updatedCrawlSource as CrawlSourceResponse;
  }

  async deleteCrawlSource(id: string): Promise<void> {
    const crawlSource = await prisma.crawlSource.findUnique({
      where: { id },
    });

    if (!crawlSource) {
      throw new NotFoundException('Crawl source not found');
    }

    await prisma.crawlSource.delete({
      where: { id },
    });

    logger.info('Crawl source deleted successfully', {
      crawlSourceId: id,
    });
  }

  async triggerCrawl(
    id: string,
    userId?: string
  ): Promise<{ message: string; jobId: string }> {
    const crawlSource = await prisma.crawlSource.findUnique({
      where: { id },
    });

    if (!crawlSource) {
      throw new NotFoundException('Crawl source not found');
    }

    if (!crawlSource.isActive) {
      throw new ConflictException('Crawl source is not active');
    }

    logger.info('Queuing crawl for source', {
      crawlSourceId: id,
      url: crawlSource.url,
    });

    // Queue the listing crawl job
    const job = await crawlQueueService.queueListingCrawl(
      {
        crawlSourceId: id,
        url: crawlSource.url,
        scraperType: crawlSource.scraperType,
        userId,
      },
      {
        priority: 10, // High priority for manual triggers
        delay: 0, // Execute immediately
      }
    );

    logger.info('Crawl job queued successfully', {
      crawlSourceId: id,
      jobId: job.id,
    });

    return {
      message: 'Crawl job queued successfully. Processing will begin shortly.',
      jobId: job.id?.toString() || 'unknown',
    };
  }

  async getQueueStatus(): Promise<{
    listing: {
      waiting: number;
      active: number;
      completed: number;
      failed: number;
    };
    details: {
      waiting: number;
      active: number;
      completed: number;
      failed: number;
    };
  }> {
    return await crawlQueueService.getQueueStats();
  }

  async triggerBulkCrawl(
    crawlSourceIds: string[],
    userId?: string
  ): Promise<{ message: string; jobIds: string[] }> {
    const jobIds: string[] = [];

    for (const id of crawlSourceIds) {
      const crawlSource = await prisma.crawlSource.findUnique({
        where: { id },
      });

      if (crawlSource && crawlSource.isActive) {
        const job = await crawlQueueService.queueListingCrawl(
          {
            crawlSourceId: id,
            url: crawlSource.url,
            scraperType: crawlSource.scraperType,
            userId,
          },
          {
            priority: 8, // Slightly lower priority for bulk operations
            delay: Math.random() * 10000, // Random delay 0-10s to avoid overwhelming
          }
        );

        jobIds.push(job.id?.toString() || 'unknown');
      }
    }

    logger.info('Bulk crawl jobs queued successfully', {
      crawlSourceCount: crawlSourceIds.length,
      jobCount: jobIds.length,
    });

    return {
      message: `${jobIds.length} crawl jobs queued successfully`,
      jobIds,
    };
  }

  async scheduleRecurringCrawls(): Promise<{
    message: string;
    jobsQueued: number;
  }> {
    const crawlSources = await prisma.crawlSource.findMany({
      where: {
        isActive: true,
        nextCrawlAt: {
          lte: new Date(),
        },
      },
    });

    let jobsQueued = 0;

    for (const crawlSource of crawlSources) {
      await crawlQueueService.queueListingCrawl(
        {
          crawlSourceId: crawlSource.id,
          url: crawlSource.url,
          scraperType: crawlSource.scraperType,
        },
        {
          priority: 5, // Medium priority for scheduled crawls
          delay: Math.random() * 30000, // Random delay 0-30s to spread load
        }
      );

      // Update next crawl time
      const nextCrawlAt = this.calculateNextCrawlTime(crawlSource.frequency);
      await prisma.crawlSource.update({
        where: { id: crawlSource.id },
        data: { nextCrawlAt },
      });

      jobsQueued++;
    }

    logger.info('Recurring crawls scheduled', {
      sourcesChecked: crawlSources.length,
      jobsQueued,
    });

    return {
      message: `${jobsQueued} recurring crawl jobs queued`,
      jobsQueued,
    };
  }

  private calculateNextCrawlTime(
    frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY'
  ): Date {
    const now = new Date();
    switch (frequency) {
      case 'DAILY':
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
      case 'WEEKLY':
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      case 'MONTHLY':
        return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    }
  }
}

export const crawlSourceService = new CrawlSourceService();
export default crawlSourceService;
