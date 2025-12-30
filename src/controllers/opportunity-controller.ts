import { NextFunction, Request, Response } from 'express';
import { opportunityService } from '../services/opportunity-service';
import { sendSuccess } from '../utils/send-response';
import {
  createOpportunitySchema,
  updateOpportunitySchema,
  opportunityQuerySchema,
  savedJobSchema,
  applicationSchema,
  updateApplicationSchema,
} from '../schemas/opportunity';

class OpportunityController {
  // Opportunity CRUD
  createOpportunity = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const validatedData = createOpportunitySchema.parse(req.body);
      const result = await opportunityService.createOpportunity(validatedData);
      return sendSuccess(res, result, 'Opportunity created successfully', 201);
    } catch (error) {
      next(error);
    }
  };

  getOpportunities = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const validatedQuery = opportunityQuerySchema.parse(req.query);
      const result = await opportunityService.getOpportunities(validatedQuery);
      return sendSuccess(res, result, 'Opportunities retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  getOpportunityById = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { id } = req.params;
      const result = await opportunityService.getOpportunityById(id);
      return sendSuccess(res, result, 'Opportunity retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  updateOpportunity = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { id } = req.params;
      const validatedData = updateOpportunitySchema.parse(req.body);
      const result = await opportunityService.updateOpportunity(
        id,
        validatedData
      );
      return sendSuccess(res, result, 'Opportunity updated successfully');
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
      await opportunityService.deleteOpportunity(id);
      return sendSuccess(res, null, 'Opportunity deleted successfully');
    } catch (error) {
      next(error);
    }
  };

  // Saved Jobs
  saveJob = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const validatedData = savedJobSchema.parse(req.body);
      const result = await opportunityService.saveJob(userId, validatedData);
      return sendSuccess(res, result, 'Job saved successfully');
    } catch (error) {
      next(error);
    }
  };

  unsaveJob = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const { opportunityId } = req.params;
      const result = await opportunityService.unsaveJob(userId, opportunityId);
      return sendSuccess(res, result, 'Job unsaved successfully');
    } catch (error) {
      next(error);
    }
  };

  getUserSavedJobs = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const result = await opportunityService.getUserSavedJobs(
        userId,
        page,
        limit
      );
      return sendSuccess(res, result, 'Saved jobs retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  // Applications
  applyToOpportunity = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const validatedData = applicationSchema.parse(req.body);
      const result = await opportunityService.applyToOpportunity(
        userId,
        validatedData
      );
      return sendSuccess(
        res,
        result,
        'Application submitted successfully',
        201
      );
    } catch (error) {
      next(error);
    }
  };

  getUserApplications = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const result = await opportunityService.getUserApplications(
        userId,
        page,
        limit
      );
      return sendSuccess(res, result, 'Applications retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  getApplicationById = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const { applicationId } = req.params;
      const result = await opportunityService.getApplicationById(
        userId,
        applicationId
      );
      return sendSuccess(res, result, 'Application retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  updateApplication = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const { applicationId } = req.params;
      const validatedData = updateApplicationSchema.parse(req.body);
      const result = await opportunityService.updateApplication(
        userId,
        applicationId,
        validatedData
      );
      return sendSuccess(res, result, 'Application updated successfully');
    } catch (error) {
      next(error);
    }
  };

  withdrawApplication = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const { applicationId } = req.params;
      const result = await opportunityService.withdrawApplication(
        userId,
        applicationId
      );
      return sendSuccess(res, result, 'Application withdrawn successfully');
    } catch (error) {
      next(error);
    }
  };

  // Admin-specific methods
  getAdminOpportunities = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const validatedQuery = opportunityQuerySchema.parse(req.query);
      const result = await opportunityService.getOpportunities(validatedQuery);
      return sendSuccess(res, result, 'Admin opportunities retrieved successfully');
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
      const result = await opportunityService.getOpportunityStats();
      return sendSuccess(res, result, 'Opportunity stats retrieved successfully');
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
      
      if (!['published', 'draft', 'archived'].includes(status)) {
        return res.status(400).json({ message: 'Invalid status' });
      }

      const isActive = status === 'published';
      const result = await opportunityService.updateOpportunity(id, { isActive });
      return sendSuccess(res, result, 'Opportunity status updated successfully');
    } catch (error) {
      next(error);
    }
  };
}

export const opportunityController = new OpportunityController();
export default opportunityController;
