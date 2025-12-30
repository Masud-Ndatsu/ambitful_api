import { BaseScraper } from './base-scraper';
import { OpportunityForAfricansScraper } from './opportunity-for-africans-scraper';
import { IndeedScraper } from './indeed-scraper';
import { LinkedInScraper } from './linkedin-scraper';

export type ScraperType = 'INDEED' | 'OPPORTUNITY_FOR_AFRICANS' | 'LINKEDIN';

export class ScraperFactory {
  private static scrapers: Map<ScraperType, BaseScraper> = new Map();

  static {
    // Initialize scrapers
    this.scrapers.set(
      'OPPORTUNITY_FOR_AFRICANS',
      new OpportunityForAfricansScraper()
    );
    this.scrapers.set('INDEED', new IndeedScraper());
    this.scrapers.set('LINKEDIN', new LinkedInScraper());
  }

  /**
   * Get scraper instance by type
   */
  static getScraper(type: ScraperType): BaseScraper {
    const scraper = this.scrapers.get(type);
    if (!scraper) {
      throw new Error(`Scraper not found for type: ${type}`);
    }
    return scraper;
  }

  /**
   * Get scraper by URL - automatically detects scraper type based on URL
   */
  static getScraperByUrl(url: string): BaseScraper | null {
    for (const scraper of this.scrapers.values()) {
      if (scraper.isUrlCompatible(url)) {
        return scraper;
      }
    }
    return null;
  }

  /**
   * Get all available scrapers
   */
  static getAllScrapers(): Map<ScraperType, BaseScraper> {
    return new Map(this.scrapers);
  }

  /**
   * Get available scraper types
   */
  static getAvailableTypes(): ScraperType[] {
    return Array.from(this.scrapers.keys());
  }

  /**
   * Validate if scraper type exists
   */
  static isValidType(type: string): type is ScraperType {
    return this.scrapers.has(type as ScraperType);
  }

  /**
   * Get scraper display information
   */
  static getScraperInfo() {
    const scraperInfo: Array<{
      type: ScraperType;
      displayName: string;
      supportedDomains: string[];
    }> = [];

    for (const [type, scraper] of this.scrapers.entries()) {
      scraperInfo.push({
        type,
        displayName: scraper.getDisplayName(),
        supportedDomains: scraper.getSupportedDomains(),
      });
    }

    return scraperInfo;
  }
}
