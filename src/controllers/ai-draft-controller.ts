import { NextFunction, Request, Response } from 'express';
import { aiDraftService } from '../services/ai-draft-service';
import { sendSuccess } from '../utils/send-response';
import {
  createAIDraftSchema,
  updateAIDraftSchema,
  aiDraftQuerySchema,
  reviewAIDraftSchema,
  publishAIDraftSchema,
} from '../schemas/ai-draft';

class AIDraftController {
  createAIDraft = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const validatedData = createAIDraftSchema.parse(req.body);
      const result = await aiDraftService.createAIDraft(validatedData);
      return sendSuccess(res, result, 'AI draft created successfully', 201);
    } catch (error) {
      next(error);
    }
  };

  getAIDrafts = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const validatedQuery = aiDraftQuerySchema.parse(req.query);
      const result = await aiDraftService.getAIDrafts(validatedQuery);
      return sendSuccess(res, result, 'AI drafts retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  getAIDraftById = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { id } = req.params;
      const result = await aiDraftService.getAIDraftById(id);
      return sendSuccess(res, result, 'AI draft retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  updateAIDraft = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { id } = req.params;
      const validatedData = updateAIDraftSchema.parse(req.body);
      const result = await aiDraftService.updateAIDraft(id, validatedData);
      return sendSuccess(res, result, 'AI draft updated successfully');
    } catch (error) {
      next(error);
    }
  };

  deleteAIDraft = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { id } = req.params;
      await aiDraftService.deleteAIDraft(id);
      return sendSuccess(res, null, 'AI draft deleted successfully');
    } catch (error) {
      next(error);
    }
  };

  reviewAIDraft = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { id } = req.params;
      const validatedData = reviewAIDraftSchema.parse(req.body);
      const reviewerId = req.user?.id;

      if (!reviewerId) {
        return sendSuccess(res, null, 'User not authenticated', 401);
      }

      const result = await aiDraftService.reviewAIDraft(
        id,
        validatedData,
        reviewerId
      );
      return sendSuccess(res, result, 'AI draft reviewed successfully');
    } catch (error) {
      next(error);
    }
  };

  publishAIDraft = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { id } = req.params;
      const validatedData = publishAIDraftSchema.parse(req.body);
      const result = await aiDraftService.publishAIDraft(id, validatedData);
      return sendSuccess(res, result, 'AI draft published successfully');
    } catch (error) {
      next(error);
    }
  };

  getAIDraftStats = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const result = await aiDraftService.getAIDraftStats();
      return sendSuccess(res, result, 'AI draft stats retrieved successfully');
    } catch (error) {
      next(error);
    }
  };
}

export const aiDraftController = new AIDraftController();
export default aiDraftController;

