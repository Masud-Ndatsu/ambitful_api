import {
  BaseScraper,
  OpportunityDetails,
  ScrapingResult,
} from './base-scraper';
import scraperDo, { ScraperDoService } from '../scraper-do-service';
import { convertHtmlToMarkdown } from '../../utils/html-to-md.js';
import {
  extractOpportunityDetailsPrompt,
  extractOpportunityMetadataPrompt,
} from '../../constant/ai-prompts/opportunity-desk-prompt.js';
import openaiClient, { OPENAI_MODEL } from '../../constant/ai';
import retry from 'async-retry';
import cleanLLMJson from '../../utils/clean-llm-json';
import redis from '../../config/redis.js';
import {
  OpportunityListingResp,
  OpportunityDetailsResp,
} from '../../types/scraper.types';
import { CreateOpportunityData } from '../../schemas/opportunity';

export class OpportunityForAfricansScraper extends BaseScraper {
  scraperType = 'OPPORTUNITY_FOR_AFRICANS' as const;
  private scraperDo: ScraperDoService;
  private CACHE_TTL = 60 * 60 * 24; // 24 hours

  constructor() {
    super();
    this.scraperDo = scraperDo;
  }

  getDisplayName(): string {
    return 'Opportunity for Africans';
  }

  getSupportedDomains(): string[] {
    return ['opportunitydesk.org', 'www.opportunitydesk.org'];
  }

  isUrlCompatible(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return this.getSupportedDomains().includes(urlObj.hostname);
    } catch {
      return false;
    }
  }

  private getCacheKey(type: 'listing' | 'details', identifier: string): string {
    return `opportunity_desk:${type}:${identifier}`;
  }

  constructOpportunityDetailsPage(path: string): string {
    return `https://opportunitydesk.org/${path}`;
  }

  async scrapeOpportunityListing(url: string): Promise<ScrapingResult> {
    const cacheKey = this.getCacheKey('listing', url);
    const cached = await redis.get(cacheKey);
    if (cached) {
      console.log('Cache hit for opportunity listing:', url);
      const cachedData = JSON.parse(cached) as OpportunityListingResp;
      return {
        success: true,
        opportunity_listings: cachedData.opportunity_listings,
        total_found: cachedData.opportunity_listings.length,
      };
    }

    try {
      const response = await this.scraperDo.scrape(url);
      const data = response?.data;

      if (!data) {
        throw new Error('Error scraping ' + url);
      }

      const markdownConversion = convertHtmlToMarkdown(data);

      const result = await retry(
        async () => {
          const aiResult = await openaiClient.chat.completions.create({
            model: OPENAI_MODEL,
            messages: [
              {
                role: 'user',
                content: extractOpportunityMetadataPrompt(markdownConversion),
              },
            ],
            temperature: 0,
          });

          const aiResp = aiResult.choices[0]?.message?.content || '';
          return cleanLLMJson(aiResp as any);
        },
        { retries: 3, minTimeout: 1000, maxTimeout: 5000 }
      );

      const opportunityListingResp: OpportunityListingResp = JSON.parse(result);

      // Cache the result
      await redis.set(
        cacheKey,
        JSON.stringify(opportunityListingResp),
        'EX',
        this.CACHE_TTL
      );

      return {
        success: true,
        opportunity_listings: opportunityListingResp.opportunity_listings,
        total_found: opportunityListingResp.opportunity_listings.length,
      };
    } catch (error: any) {
      return {
        success: false,
        opportunity_listings: [],
        total_found: 0,
        errors: [error.message],
      };
    }
  }

  async scrapeOpportunityDetails(
    opportunityId: string
  ): Promise<OpportunityDetails> {
    const cacheKey = this.getCacheKey('details', opportunityId);
    const cached = await redis.get(cacheKey);
    if (cached) {
      console.log('Cache hit for opportunity details:', opportunityId);
      return JSON.parse(cached) as OpportunityDetails;
    }

    const opportunityDetailsPage =
      this.constructOpportunityDetailsPage(opportunityId);
    const response = await this.scraperDo.scrape(opportunityDetailsPage);
    const data = response?.data;

    if (!data) {
      throw new Error(
        'Error scraping opportunity details for ' + opportunityId
      );
    }

    const markdownConversion = convertHtmlToMarkdown(data);

    const result = await retry(
      async () => {
        const aiResult = await openaiClient.chat.completions.create({
          model: OPENAI_MODEL,
          messages: [
            {
              role: 'user',
              content: extractOpportunityDetailsPrompt(markdownConversion),
            },
          ],
          temperature: 0,
        });

        const aiResp = aiResult.choices[0]?.message?.content || '';
        return cleanLLMJson(aiResp as any);
      },
      { retries: 3, minTimeout: 1000, maxTimeout: 5000 }
    );

    const opportunityDetailsResp: OpportunityDetailsResp = JSON.parse(result);

    const opportunityDetails: OpportunityDetails = {
      id: opportunityId,
      title: opportunityDetailsResp.title || '',
      organization: opportunityDetailsResp.organization || '',
      description: opportunityDetailsResp.description || '',
      requirements: opportunityDetailsResp.requirements || [],
      benefits: opportunityDetailsResp.benefits || [],
      compensation: opportunityDetailsResp.compensation,
      compensationType: opportunityDetailsResp.compensationType,
      locations: opportunityDetailsResp.locations || [],
      isRemote: opportunityDetailsResp.isRemote || false,
      deadline: opportunityDetailsResp.deadline || '',
      applicationUrl: opportunityDetailsResp.applicationUrl,
      contactEmail: opportunityDetailsResp.contactEmail || '',
      experienceLevel: opportunityDetailsResp.experienceLevel,
      duration: opportunityDetailsResp.duration || '',
      eligibility: opportunityDetailsResp.eligibility || [],
      rawData: opportunityDetailsResp,
    };

    // Cache the result
    await redis.set(
      cacheKey,
      JSON.stringify(opportunityDetails),
      'EX',
      this.CACHE_TTL
    );

    return opportunityDetails;
  }

  async convertToOpportunityFormat(
    detailsData: OpportunityDetails,
    opportunityTypeId: string
  ): Promise<CreateOpportunityData> {
    return {
      title: detailsData.title,
      organization: detailsData.organization,
      description: detailsData.description,
      requirements: detailsData.requirements,
      benefits: detailsData.benefits,
      compensation: detailsData.compensation || '',
      compensationType: (detailsData.compensationType as any) || 'UNKNOWN',
      locations: detailsData.locations,
      isRemote: detailsData.isRemote,
      deadline: detailsData.deadline,
      applicationUrl: detailsData.applicationUrl || '',
      contactEmail: detailsData.contactEmail || '',
      experienceLevel: detailsData.experienceLevel || 'any',
      duration: detailsData.duration || '',
      eligibility: detailsData.eligibility,
      opportunityTypeIds: [opportunityTypeId],
    };
  }
}

export const opportunityForAfricansScraper = new OpportunityForAfricansScraper();
export default opportunityForAfricansScraper;
