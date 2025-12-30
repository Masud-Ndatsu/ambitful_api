import { CreateOpportunityData } from '../../schemas/opportunity';

export interface OpportunityListing {
  opportunity_id: string;
  title: string;
  organization?: string;
  location?: string;
  deadline?: string;
  url?: string;
}

export interface OpportunityDetails {
  id: string;
  title: string;
  organization: string;
  description: string;
  requirements: string[];
  benefits: string[];
  compensation?: string;
  compensationType?: string;
  locations: string[];
  isRemote: boolean;
  deadline: string;
  applicationUrl?: string;
  contactEmail?: string;
  experienceLevel?: string;
  duration?: string;
  eligibility: string[];
  rawData?: any; // Raw scraped data for debugging
}

export interface ScrapingResult {
  success: boolean;
  opportunity_listings: OpportunityListing[];
  total_found: number;
  errors?: string[];
}

export abstract class BaseScraper {
  abstract scraperType: 'INDEED' | 'OPPORTUNITY_FOR_AFRICANS' | 'LINKEDIN';

  /**
   * Scrapes opportunity listings from a given URL
   */
  abstract scrapeOpportunityListing(url: string): Promise<ScrapingResult>;

  /**
   * Scrapes detailed information for a specific opportunity
   */
  abstract scrapeOpportunityDetails(
    opportunityId: string
  ): Promise<OpportunityDetails>;

  /**
   * Converts scraped data to the standard opportunity format
   */
  abstract convertToOpportunityFormat(
    detailsData: OpportunityDetails,
    opportunityTypeId: string
  ): Promise<CreateOpportunityData>;

  /**
   * Constructs the URL for opportunity details page
   */
  abstract constructOpportunityDetailsPage(opportunityId: string): string;

  /**
   * Validates if the URL is compatible with this scraper
   */
  abstract isUrlCompatible(url: string): boolean;

  /**
   * Gets the display name for this scraper
   */
  abstract getDisplayName(): string;

  /**
   * Gets supported domains for this scraper
   */
  abstract getSupportedDomains(): string[];
}
