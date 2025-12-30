import { Router } from 'express';
import { opportunityController } from '../controllers/opportunity-controller';
import { authenticate } from '../middleware/auth';
import { requireAdmin, requireModeratorOrAdmin } from '../middleware/role-guard';

const router = Router();

// Public routes - opportunities can be viewed by anyone
router.get(
  '/',
  opportunityController.getOpportunities
);

router.get(
  '/:id',
  opportunityController.getOpportunityById
);

// Protected routes - require authentication
router.use(authenticate);

// Admin routes for managing opportunities - require moderator or admin role
router.post(
  '/',
  requireModeratorOrAdmin,
  opportunityController.createOpportunity
);

router.put(
  '/:id',
  requireModeratorOrAdmin,
  opportunityController.updateOpportunity
);

router.delete(
  '/:id',
  requireAdmin,
  opportunityController.deleteOpportunity
);

// User-specific routes
// Saved Jobs
router.post(
  '/saved',
  opportunityController.saveJob
);

router.delete(
  '/saved/:opportunityId',
  opportunityController.unsaveJob
);

router.get(
  '/saved/list',
  opportunityController.getUserSavedJobs
);

// Applications
router.post(
  '/apply',
  opportunityController.applyToOpportunity
);

router.get(
  '/applications/list',
  opportunityController.getUserApplications
);

router.get(
  '/applications/:applicationId',
  opportunityController.getApplicationById
);

router.put(
  '/applications/:applicationId',
  opportunityController.updateApplication
);

router.patch(
  '/applications/:applicationId/withdraw',
  opportunityController.withdrawApplication
);

// Admin routes - require admin or moderator role
router.get(
  '/admin/opportunities',
  requireModeratorOrAdmin,
  opportunityController.getAdminOpportunities
);

router.get(
  '/admin/stats',
  requireModeratorOrAdmin,
  opportunityController.getOpportunityStats
);

router.patch(
  '/admin/opportunities/:id/status',
  requireAdmin,
  opportunityController.updateOpportunityStatus
);

export default router;