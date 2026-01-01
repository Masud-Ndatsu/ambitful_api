import Bull from 'bull';
import redis from '../config/redis';
import logger from '../config/logger';
import { ScraperFactory } from './scrapers/scraper-factory';
import { prisma } from '../config/database';
import { parseDeadline } from '../utils/parse-deadline';
import { OpportunityDetails } from './scrapers/base-scraper';
import { CrawlSourceStatus } from '../generated/prisma/enums';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ListingCrawlJobData {
  crawlSourceId: string;
  url: string;
  scraperType: string;
  userId?: string;
}

export interface DetailsCrawlJobData {
  crawlSourceId: string;
  opportunityId: string;
  scraperType: string;
  cacheKey: string;
  userId?: string;
}

export interface CrawlJobOptions {
  priority?: number;
  delay?: number;
  attempts?: number;
  backoff?: { type: 'fixed' | 'exponential'; delay: number };
}

interface AIDialogCreationData {
  listing: Record<string, any>;
  details?: OpportunityDetails;
  crawlSourceId: string;
  sourceUrl: string;
  isDetailsCrawled: boolean;
}

interface CachedListingData {
  listings: any[];
  timestamp: number;
  crawlSourceId: string;
  url: string;
  crawlSource: { id: string; isDetailsCrawled: boolean };
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const QUEUE_CONFIG = {
  removeOnComplete: 5,
  removeOnFail: 5,
  attempts: 1,
  backoff: { type: 'exponential' as const },
};

const CACHE_TTL_HOURS = 24;
const STALE_CACHE_HOURS = 23;
const DEFAULT_DEADLINE_DAYS = 30;

// ─────────────────────────────────────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────────────────────────────────────

class CrawlQueueService {
  private listingQueue: Bull.Queue<ListingCrawlJobData>;
  private detailsQueue: Bull.Queue<DetailsCrawlJobData>;

  constructor() {
    const redisConfig = {
      host: redis.options.host,
      port: redis.options.port,
      password: redis.options.password,
    };

    this.listingQueue = new Bull('listing-crawl', {
      redis: redisConfig,
      defaultJobOptions: QUEUE_CONFIG,
    });

    this.detailsQueue = new Bull('details-crawl', {
      redis: redisConfig,
      defaultJobOptions: QUEUE_CONFIG,
    });

    this.setupJobProcessors();
    this.setupEventListeners();
  }

  // ───────────────────────────────────────────────────────────────────────────
  // AI Draft Creation
  // ───────────────────────────────────────────────────────────────────────────

  private async createAIDraft(data: AIDialogCreationData): Promise<boolean> {
    const { listing, details, crawlSourceId, sourceUrl, isDetailsCrawled } =
      data;

    if (!listing || !crawlSourceId || !sourceUrl) {
      logger.error('Invalid AI draft creation data', {
        crawlSourceId,
        sourceUrl,
      });
      return false;
    }

    try {
      const existingDraft = await prisma.aIDraft.findFirst({
        where: { sourceUrl, crawlSourceId },
      });

      if (existingDraft) return false;

      const deadline = this.parseDeadlineWithFallback(
        details?.deadline || listing.deadline
      );

      await prisma.aIDraft.create({
        data: {
          title: details?.title || listing.title || 'Untitled Opportunity',
          organization:
            details?.organization ||
            listing.organization ||
            'Unknown Organization',
          description:
            details?.description ||
            listing.excerpt ||
            listing.short_description ||
            'No description available',
          requirements: details?.requirements || [],
          benefits: details?.benefits || [],
          compensation: details?.compensation || '',
          compensationType: details?.compensationType || null,
          locations:
            details?.locations || (listing.location ? [listing.location] : []),
          isRemote: details?.isRemote || false,
          deadline,
          applicationUrl: details?.applicationUrl || listing.url || sourceUrl,
          contactEmail: details?.contactEmail || '',
          experienceLevel: details?.experienceLevel || 'any',
          duration: details?.duration || '',
          eligibility: details?.eligibility || listing.eligibility || [],
          crawlSourceId,
          sourceUrl,
          status: 'PENDING',
          isDetailsCrawled,
          rawScrapedData: isDetailsCrawled
            ? { listing, details: details?.rawData || details }
            : listing,
          rawData: JSON.stringify(
            isDetailsCrawled ? { listing, details } : listing
          ),
        },
      });

      return true;
    } catch (error: any) {
      logger.error('Failed to create AI draft', {
        sourceUrl,
        error: error.message,
      });
      return false;
    }
  }

  private parseDeadlineWithFallback(scrapedDeadline: string | undefined): Date {
    const parsed = parseDeadline(scrapedDeadline);
    if (parsed && !isNaN(parsed.getTime())) return parsed;
    return new Date(Date.now() + DEFAULT_DEADLINE_DAYS * 24 * 60 * 60 * 1000);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Job Processors
  // ───────────────────────────────────────────────────────────────────────────

  private setupJobProcessors(): void {
    this.listingQueue.process('crawl-listing', 5, (job) =>
      this.processListingCrawl(job)
    );
    this.detailsQueue.process('crawl-details', 10, (job) =>
      this.processDetailsCrawl(job)
    );
  }

  private delay = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

  private async processListingCrawl(job: Bull.Job<ListingCrawlJobData>) {
    const { crawlSourceId, url, scraperType } = job.data;

    try {
      const crawlSource = await this.getCrawlSource(crawlSourceId);
      await this.updateCrawlSourceStatus(crawlSourceId, 'ACTIVE');

      const scraper = this.getScraper(scraperType);
      const result = await scraper.scrapeOpportunityListing(url);

      if (!result?.success || !result.opportunity_listings.length) {
        const errorMessage = result?.errors?.length
          ? `Crawl failed: ${result.errors.join(', ')}`
          : 'No opportunities found';
        throw new Error(errorMessage);
      }

      const cacheKey = this.buildCacheKey(crawlSourceId, url);
      await this.cacheListings(
        cacheKey,
        result.opportunity_listings,
        crawlSourceId,
        url,
        crawlSource
      );

      if (crawlSource.isDetailsCrawled) {
        await this.queueDetailsCrawlJobs(
          result.opportunity_listings,
          crawlSourceId,
          scraperType,
          cacheKey
        );
      } else {
        await this.createAIDraftsFromListings(
          result.opportunity_listings,
          crawlSourceId,
          scraperType
        );
      }

      await this.updateCrawlSourceSuccess(
        crawlSourceId,
        crawlSource,
        result.total_found
      );

      logger.info(
        `Listing crawl completed: ${result.total_found} opportunities`,
        { crawlSourceId }
      );

      return result;
    } catch (error: any) {
      logger.error(`Listing crawl failed: ${url}`, {
        error: error.message,
        crawlSourceId,
      });
      await this.updateCrawlSourceError(crawlSourceId, error.message);
      throw error;
    }
  }

  private async processDetailsCrawl(job: Bull.Job<DetailsCrawlJobData>) {
    const { crawlSourceId, opportunityId, scraperType, cacheKey } = job.data;

    try {
      const { listings } = await this.getCachedData(cacheKey);
      const listingData = listings.find(
        (l: any) => l.opportunity_id === opportunityId
      );

      if (!listingData) {
        throw new Error(`Listing not found for opportunity: ${opportunityId}`);
      }

      const scraper = this.getScraper(scraperType);
      const details = await scraper.scrapeOpportunityDetails(opportunityId);

      if (!details?.id) {
        throw new Error('Invalid opportunity details format');
      }

      const sourceUrl = scraper.constructOpportunityDetailsPage(opportunityId);
      const aiDraftCreated = await this.createAIDraft({
        listing: listingData,
        details,
        crawlSourceId,
        sourceUrl,
        isDetailsCrawled: true,
      });

      return { listing: listingData, details, aiDraftCreated };
    } catch (error: any) {
      logger.error(`Details crawl failed: ${opportunityId}`, {
        error: error.message,
        crawlSourceId,
      });
      throw error;
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Helper Methods
  // ───────────────────────────────────────────────────────────────────────────

  private async getCrawlSource(id: string) {
    const source = await prisma.crawlSource.findUnique({ where: { id } });
    if (!source) throw new Error(`Crawl source not found: ${id}`);
    return source;
  }

  private getScraper(scraperType: string) {
    const scraper = ScraperFactory.getScraper(scraperType as any);
    if (!scraper) throw new Error(`Unsupported scraper type: ${scraperType}`);
    return scraper;
  }

  private buildCacheKey(crawlSourceId: string, url: string): string {
    const urlHash = Buffer.from(url).toString('base64').slice(-10);
    return `crawl_listings:${crawlSourceId}:${urlHash}`;
  }

  private async cacheListings(
    cacheKey: string,
    listings: any[],
    crawlSourceId: string,
    url: string,
    crawlSource: { id: string; isDetailsCrawled: boolean }
  ): Promise<void> {
    const cacheData: CachedListingData = {
      listings,
      timestamp: Date.now(),
      crawlSourceId,
      url,
      crawlSource: {
        id: crawlSource.id,
        isDetailsCrawled: crawlSource.isDetailsCrawled,
      },
    };
    await redis.set(
      cacheKey,
      JSON.stringify(cacheData),
      'EX',
      CACHE_TTL_HOURS * 60 * 60
    );
  }

  private async getCachedData(cacheKey: string) {
    const cachedData = await redis.get(cacheKey);
    if (!cachedData) throw new Error(`Cache not found: ${cacheKey}`);

    const parsed: CachedListingData = JSON.parse(cachedData);
    if (
      !Array.isArray(parsed.listings) ||
      !parsed.timestamp ||
      !parsed.crawlSource
    ) {
      throw new Error(`Corrupted cache: ${cacheKey}`);
    }

    const cacheAgeHours = (Date.now() - parsed.timestamp) / (1000 * 60 * 60);
    if (cacheAgeHours > STALE_CACHE_HOURS) {
      logger.warn('Using stale cache', {
        cacheKey,
        cacheAgeHours: cacheAgeHours.toFixed(1),
      });
    }

    return { listings: parsed.listings, cachedCrawlSource: parsed.crawlSource };
  }

  private async queueDetailsCrawlJobs(
    listings: any[],
    crawlSourceId: string,
    scraperType: string,
    cacheKey: string
  ): Promise<void> {
    const jobs = listings.map((listing) =>
      this.queueDetailsCrawl(
        {
          crawlSourceId,
          opportunityId: listing.opportunity_id,
          scraperType,
          cacheKey,
        },
        { priority: 5, delay: Math.random() * 5000 }
      )
    );
    await Promise.all(jobs);
  }

  private async createAIDraftsFromListings(
    listings: any[],
    crawlSourceId: string,
    scraperType: string
  ): Promise<number> {
    const scraper = this.getScraper(scraperType);
    let created = 0;

    for (const listing of listings) {
      try {
        const sourceUrl = scraper.constructOpportunityDetailsPage(
          listing.opportunity_id
        );
        if (
          await this.createAIDraft({
            listing,
            crawlSourceId,
            sourceUrl,
            isDetailsCrawled: false,
          })
        ) {
          created++;
        }
      } catch {
        // Continue processing remaining listings
      }
    }

    return created;
  }

  private async updateCrawlSourceStatus(
    id: string,
    status: CrawlSourceStatus
  ): Promise<void> {
    await prisma.crawlSource.update({
      where: { id },
      data: {
        status,
        lastCrawledAt: new Date(),
        errorMessage: null,
      },
    });
  }

  private async updateCrawlSourceSuccess(
    id: string,
    crawlSource: { opportunitiesFound: number | null },
    foundCount: number
  ): Promise<void> {
    await prisma.crawlSource.update({
      where: { id },
      data: {
        status: 'INACTIVE',
        opportunitiesFound: (crawlSource.opportunitiesFound || 0) + foundCount,
        lastCrawledAt: new Date(),
      },
    });
  }

  private async updateCrawlSourceError(
    id: string,
    errorMessage: string
  ): Promise<void> {
    try {
      await prisma.crawlSource.update({
        where: { id },
        data: { status: 'ERROR', errorMessage: errorMessage.slice(0, 500) },
      });
    } catch {
      // Silently fail - already in error state
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Event Listeners
  // ───────────────────────────────────────────────────────────────────────────

  private setupEventListeners(): void {
    this.listingQueue.on('failed', (job, err) => {
      logger.error('Listing job failed', { jobId: job.id, error: err.message });
    });

    this.detailsQueue.on('failed', (job, err) => {
      logger.error('Details job failed', { jobId: job.id, error: err.message });
    });
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Public API
  // ───────────────────────────────────────────────────────────────────────────

  async queueListingCrawl(
    data: ListingCrawlJobData,
    options: CrawlJobOptions = {}
  ): Promise<Bull.Job<ListingCrawlJobData>> {
    return this.listingQueue.add('crawl-listing', data, {
      priority: options.priority ?? 10,
      delay: options.delay ?? 0,
      attempts: options.attempts ?? 3,
      backoff: options.backoff ?? QUEUE_CONFIG.backoff,
    });
  }

  async queueDetailsCrawl(
    data: DetailsCrawlJobData,
    options: CrawlJobOptions = {}
  ): Promise<Bull.Job<DetailsCrawlJobData>> {
    return this.detailsQueue.add('crawl-details', data, {
      priority: options.priority ?? 5,
      delay: options.delay ?? 0,
      attempts: options.attempts ?? 3,
      backoff: options.backoff ?? QUEUE_CONFIG.backoff,
    });
  }

  async getQueueStats() {
    const [listing, details] = await Promise.all([
      this.getQueueCounts(this.listingQueue),
      this.getQueueCounts(this.detailsQueue),
    ]);
    return { listing, details };
  }

  private async getQueueCounts(queue: Bull.Queue) {
    const [waiting, active, completed, failed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
    ]);
    return { waiting, active, completed, failed };
  }

  async cleanupJobs(): Promise<void> {
    const DAY_MS = 24 * 60 * 60 * 1000;
    await Promise.all([
      this.listingQueue.clean(DAY_MS, 'completed'),
      this.listingQueue.clean(7 * DAY_MS, 'failed'),
      this.detailsQueue.clean(DAY_MS, 'completed'),
      this.detailsQueue.clean(7 * DAY_MS, 'failed'),
    ]);
  }

  async shutdown(): Promise<void> {
    await Promise.all([this.listingQueue.close(), this.detailsQueue.close()]);
    logger.info('Crawl queues shut down');
  }
}

export const crawlQueueService = new CrawlQueueService();
export default crawlQueueService;
