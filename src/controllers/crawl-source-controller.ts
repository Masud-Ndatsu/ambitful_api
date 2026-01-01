import { NextFunction, Request, Response } from 'express';
import { crawlSourceService } from '../services/crawl-source-service';
import { sendSuccess } from '../utils/send-response';
import {
  createCrawlSourceSchema,
  updateCrawlSourceSchema,
  crawlSourceQuerySchema,
} from '../schemas/crawl-source';

class CrawlSourceController {
  createCrawlSource = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const validatedData = createCrawlSourceSchema.parse(req.body);
      const result = await crawlSourceService.createCrawlSource(validatedData);
      return sendSuccess(res, result, 'Crawl source created successfully', 201);
    } catch (error) {
      next(error);
    }
  };

  getCrawlSources = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const validatedQuery = crawlSourceQuerySchema.parse(req.query);
      const result = await crawlSourceService.getCrawlSources(validatedQuery);
      return sendSuccess(res, result, 'Crawl sources retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  getCrawlSourceById = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { id } = req.params;
      const result = await crawlSourceService.getCrawlSourceById(id);
      return sendSuccess(res, result, 'Crawl source retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  updateCrawlSource = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { id } = req.params;
      const validatedData = updateCrawlSourceSchema.parse(req.body);
      const result = await crawlSourceService.updateCrawlSource(id, validatedData);
      return sendSuccess(res, result, 'Crawl source updated successfully');
    } catch (error) {
      next(error);
    }
  };

  deleteCrawlSource = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { id } = req.params;
      await crawlSourceService.deleteCrawlSource(id);
      return sendSuccess(res, null, 'Crawl source deleted successfully');
    } catch (error) {
      next(error);
    }
  };

  triggerCrawl = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { id } = req.params;
      const result = await crawlSourceService.triggerCrawl(id);
      return sendSuccess(res, result, 'Crawl triggered successfully');
    } catch (error) {
      next(error);
    }
  };

  getQueueStatus = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const result = await crawlSourceService.getQueueStatus();
      return sendSuccess(res, result, 'Queue status retrieved successfully');
    } catch (error) {
      next(error);
    }
  };
}

export const crawlSourceController = new CrawlSourceController();
export default crawlSourceController;

