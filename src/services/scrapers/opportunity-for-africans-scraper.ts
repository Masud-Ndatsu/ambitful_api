import {
  BaseScraper,
  OpportunityDetails,
  ScrapingResult,
} from './base-scraper';
import scraperDo from '../scraper-do-service';
import { convertHtmlToMarkdown } from '../../utils/html-to-md.js';
import {
  extractOpportunityDetailsPrompt,
  extractOpportunityMetadataPrompt,
} from '../../constant/ai-prompts/opportunity-for-africans-prompt.js';
import geminiClient, { GEMINI_MODEL } from '../../constant/ai';
import retry from 'async-retry';
import {
  OpportunityListingResp,
  OpportunityDetailsResp,
} from '../../types/scraper.types';
import { CreateOpportunityData } from '../../schemas/opportunity';

export class OpportunityForAfricansScraper extends BaseScraper {
  scraperType = 'OPPORTUNITY_FOR_AFRICANS' as const;

  constructor() {
    super();
  }

  private cleanAIResponse(raw: string): string {
    const match = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    return match ? match[1].trim() : raw.trim();
  }

  getDisplayName(): string {
    return 'Opportunity for Africans';
  }

  getSupportedDomains(): string[] {
    return ['opportunitiesforafricans.com', 'www.opportunitiesforafricans.com'];
  }

  isUrlCompatible(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return this.getSupportedDomains().includes(urlObj.hostname);
    } catch {
      return false;
    }
  }

  constructOpportunityDetailsPage(path: string): string {
    return `https://opportunitiesforafricans.com/${path}`;
  }

  async scrapeOpportunityListing(url: string): Promise<ScrapingResult> {
    // Note: Caching is now handled at the queue service level for consistency

    try {
      const response = await scraperDo.scrape(url);
      const data = response?.data;

      if (!data) {
        throw new Error('Error scraping ' + url);
      }

      const markdownConversion = convertHtmlToMarkdown(data);

      const result = await retry(
        async () => {
          const aiResult = await geminiClient.models.generateContent({
            model: GEMINI_MODEL,
            contents: extractOpportunityMetadataPrompt(markdownConversion),
            config: {
              temperature: 0,
            },
          });

          const aiResp = aiResult.text || '';
          console.log({ aiResp });
          const cleanedResponse = this.cleanAIResponse(aiResp);
          return JSON.parse(cleanedResponse);
        },
        { retries: 3, minTimeout: 1000, maxTimeout: 5000 }
      );

      const opportunityListingResp: OpportunityListingResp = result;
      console.log({ opportunityListingResp });

      // Note: Result caching is handled at the queue service level

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
    // Note: Details caching is handled at the queue service level for efficiency

    const opportunityDetailsPage =
      this.constructOpportunityDetailsPage(opportunityId);
    const response = await scraperDo.scrape(opportunityDetailsPage);
    const data = response?.data;

    if (!data) {
      throw new Error(
        'Error scraping opportunity details for ' + opportunityId
      );
    }

    const markdownConversion = convertHtmlToMarkdown(data);

    const result = await retry(
      async () => {
        const aiResult = await geminiClient.models.generateContent({
          model: GEMINI_MODEL,
          contents: extractOpportunityDetailsPrompt(markdownConversion),
          config: {
            temperature: 0,
          },
        });

        const aiResp = aiResult.text || '';
        const cleanedResponse = this.cleanAIResponse(aiResp);
        return JSON.parse(cleanedResponse);
      },
      { retries: 3, minTimeout: 1000, maxTimeout: 5000 }
    );

    const opportunityDetailsResp: OpportunityDetailsResp = result;

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

    // Note: Details caching is handled at the queue service level

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

export const opportunityForAfricansScraper =
  new OpportunityForAfricansScraper();
export default opportunityForAfricansScraper;
