import { Router } from 'express';
import { opportunityTypeController } from '../controllers/opportunity-type-controller';
import { authenticate } from '../middleware/auth';
import {
  requireAdmin,
  requireModeratorOrAdmin,
} from '../middleware/role-guard';

const router = Router();

// Public routes
router.get('/', opportunityTypeController.getOpportunityTypes);

// Protected routes
router.use(authenticate);

// Admin routes
router.post(
  '/',
  requireModeratorOrAdmin,
  opportunityTypeController.createOpportunityType
);
router.delete(
  '/:id',
  requireAdmin,
  opportunityTypeController.deleteOpportunityType
);

export default router;
