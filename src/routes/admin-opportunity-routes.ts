import { Router } from 'express';
import { adminOpportunityController } from '../controllers/admin-opportunity-controller';
import { requireModeratorOrAdmin } from '../middleware/role-guard';
import { authenticate } from '../middleware/auth';

const router = Router();

// All admin routes require moderator or admin role
router.use(authenticate);
router.use(requireModeratorOrAdmin);

// Get admin opportunities with pagination and filters
router.get('/', adminOpportunityController.getAdminOpportunities);

// Get opportunity statistics
router.get('/stats', adminOpportunityController.getOpportunityStats);

// Update opportunity status
router.patch('/:id/status', adminOpportunityController.updateOpportunityStatus);

// Delete opportunity
router.delete('/:id', adminOpportunityController.deleteOpportunity);

export default router;
