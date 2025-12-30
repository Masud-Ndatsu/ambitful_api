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
import { ScraperFactory } from './scrapers/scraper-factory';
import { CreateOpportunityData } from '../schemas/opportunity';

class CrawlSourceService {
  constructor() {
    // No need for individual scraper instances - using factory pattern
  }

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
    id: string
  ): Promise<{ message: string; opportunitiesCreated: number }> {
    const crawlSource = await prisma.crawlSource.findUnique({
      where: { id },
    });

    if (!crawlSource) {
      throw new NotFoundException('Crawl source not found');
    }

    if (!crawlSource.isActive) {
      throw new ConflictException('Crawl source is not active');
    }

    try {
      // Update status to ACTIVE
      await prisma.crawlSource.update({
        where: { id },
        data: {
          status: 'ACTIVE',
          errorMessage: null,
        },
      });

      logger.info('Starting crawl for source', {
        crawlSourceId: id,
        url: crawlSource.url,
      });

      // Get the appropriate scraper based on scraper type
      const scraper = ScraperFactory.getScraper(crawlSource.scraperType);

      // Scrape the listing page
      const listingData = await scraper.scrapeOpportunityListing(
        crawlSource.url
      );

      let opportunitiesCreated = 0;

      // Get or create default opportunity type
      const defaultOpportunityType = await prisma.opportunityType.findFirst({
        where: { name: 'General' },
      });

      if (!defaultOpportunityType) {
        throw new Error(
          'Default opportunity type not found. Please create a "General" opportunity type.'
        );
      }

      // Process each opportunity listing
      for (const listing of listingData.opportunity_listings) {
        try {
          let detailsData = null;

          // Check if details crawling is enabled
          if (crawlSource.isDetailsCrawled) {
            // Scrape detailed information
            detailsData = await scraper.scrapeOpportunityDetails(
              listing.opportunity_id
            );
          }

          // Convert to opportunity format - use listing data if details not crawled
          const opportunityData: CreateOpportunityData = detailsData
            ? await scraper.convertToOpportunityFormat(
                detailsData,
                defaultOpportunityType.id
              )
            : {
                title: listing.title || 'Untitled Opportunity',
                organization: listing.organization || 'Unknown Organization',
                description: 'Details not yet crawled',
                requirements: [],
                benefits: [],
                compensation: '',
                compensationType: 'UNKNOWN' as any,
                locations: listing.location ? [listing.location] : [],
                isRemote: false,
                deadline:
                  listing.deadline ||
                  new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                applicationUrl: listing.url || '',
                contactEmail: '',
                experienceLevel: 'any',
                duration: '',
                eligibility: [],
                opportunityTypeIds: [defaultOpportunityType.id],
              };

          // Check if AI draft already exists by title and organization
          const existingDraft = await prisma.aIDraft.findFirst({
            where: {
              title: opportunityData.title,
              organization: opportunityData.organization,
            },
          });

          if (!existingDraft) {
            // Create AI draft instead of directly creating opportunity
            const sourceUrl = scraper.constructOpportunityDetailsPage(
              listing.opportunity_id
            );

            await prisma.aIDraft.create({
              data: {
                title: opportunityData.title,
                organization: opportunityData.organization,
                description: opportunityData.description,
                requirements: opportunityData.requirements || [],
                benefits: opportunityData.benefits || [],
                compensation: opportunityData.compensation,
                compensationType: opportunityData.compensationType,
                locations: opportunityData.locations || [],
                isRemote: opportunityData.isRemote,
                deadline: new Date(opportunityData.deadline),
                applicationUrl: opportunityData.applicationUrl,
                contactEmail: opportunityData.contactEmail,
                experienceLevel: opportunityData.experienceLevel,
                duration: opportunityData.duration,
                eligibility: opportunityData.eligibility || [],
                crawlSourceId: id,
                sourceUrl,
                status: 'PENDING',
                isDetailsCrawled: crawlSource.isDetailsCrawled,
                rawScrapedData: detailsData?.rawData || listing,
              },
            });

            opportunitiesCreated++;
            logger.info('AI draft created from crawl', {
              title: opportunityData.title,
              organization: opportunityData.organization,
            });
          } else {
            logger.info('AI draft already exists, skipping', {
              title: opportunityData.title,
            });
          }
        } catch (error: any) {
          logger.error('Error processing opportunity listing', {
            listingId: listing.opportunity_id,
            error: error.message,
          });
          // Continue with next opportunity
        }
      }

      // Update crawl source with success
      const nextCrawlAt = this.calculateNextCrawlTime(crawlSource.frequency);
      await prisma.crawlSource.update({
        where: { id },
        data: {
          status: 'INACTIVE',
          lastCrawledAt: new Date(),
          nextCrawlAt,
          opportunitiesFound:
            crawlSource.opportunitiesFound + opportunitiesCreated,
          errorMessage: null,
        },
      });

      logger.info('Crawl completed successfully', {
        crawlSourceId: id,
        opportunitiesCreated,
      });

      return {
        message: 'Crawl completed successfully',
        opportunitiesCreated,
      };
    } catch (error: any) {
      // Update crawl source with error
      await prisma.crawlSource.update({
        where: { id },
        data: {
          status: 'ERROR',
          errorMessage: error.message,
        },
      });

      logger.error('Crawl failed', {
        crawlSourceId: id,
        error: error.message,
      });

      throw error;
    }
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
