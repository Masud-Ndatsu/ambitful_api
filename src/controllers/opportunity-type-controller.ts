import { Request, Response, NextFunction } from 'express';
import { opportunityTypeService } from '../services/opportunity-type-service';
import { sendSuccess } from '../utils/send-response';
import { z } from 'zod';

const createOpportunityTypeSchema = z.object({
  name: z.string().min(1, 'Opportunity type name is required'),
});

class OpportunityTypeController {
  getOpportunityTypes = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const opportunityTypes = await opportunityTypeService.getOpportunityTypes();
      return sendSuccess(res, opportunityTypes, 'Opportunity types retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  createOpportunityType = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name } = createOpportunityTypeSchema.parse(req.body);
      
      const opportunityType = await opportunityTypeService.createOpportunityType(name);
      return sendSuccess(res, opportunityType, 'Opportunity type created successfully', 201);
    } catch (error) {
      next(error);
    }
  };

  deleteOpportunityType = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      
      await opportunityTypeService.deleteOpportunityType(id);
      return sendSuccess(res, null, 'Opportunity type deleted successfully');
    } catch (error) {
      next(error);
    }
  };
}

export const opportunityTypeController = new OpportunityTypeController();
export default opportunityTypeController;