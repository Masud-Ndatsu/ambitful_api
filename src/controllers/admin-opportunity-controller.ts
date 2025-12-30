import { NextFunction, Request, Response } from 'express';
import { adminOpportunityService } from '../services/admin-opportunity-service';
import { sendSuccess } from '../utils/send-response';
import { opportunityQuerySchema } from '../schemas/opportunity';

class AdminOpportunityController {
  getAdminOpportunities = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const validatedQuery = opportunityQuerySchema.parse(req.query);
      const result =
        await adminOpportunityService.getAdminOpportunities(validatedQuery);
      return sendSuccess(
        res,
        result,
        'Admin opportunities retrieved successfully'
      );
    } catch (error) {
      next(error);
    }
  };

  getOpportunityStats = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const result = await adminOpportunityService.getOpportunityStats();
      return sendSuccess(
        res,
        result,
        'Opportunity statistics retrieved successfully'
      );
    } catch (error) {
      next(error);
    }
  };

  updateOpportunityStatus = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const result = await adminOpportunityService.updateOpportunityStatus(
        id,
        status
      );
      return sendSuccess(
        res,
        result,
        'Opportunity status updated successfully'
      );
    } catch (error) {
      next(error);
    }
  };

  deleteOpportunity = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { id } = req.params;

      const result = await adminOpportunityService.deleteOpportunity(id);
      return sendSuccess(res, result, 'Opportunity deleted successfully');
    } catch (error) {
      next(error);
    }
  };
}

export const adminOpportunityController = new AdminOpportunityController();
