import { Router } from 'express';
import { aiDraftController } from '../controllers/ai-draft-controller';
import { authenticate } from '../middleware/auth';
import { requireAdmin, requireModeratorOrAdmin } from '../middleware/role-guard';

const router = Router();

// All AI draft routes require authentication
router.use(authenticate);

// Get all AI drafts (moderator or admin)
router.get(
  '/',
  requireModeratorOrAdmin,
  aiDraftController.getAIDrafts
);

// Get AI draft statistics (moderator or admin)
router.get(
  '/stats',
  requireModeratorOrAdmin,
  aiDraftController.getAIDraftStats
);

// Get AI draft by ID (moderator or admin)
router.get(
  '/:id',
  requireModeratorOrAdmin,
  aiDraftController.getAIDraftById
);

// Create AI draft (moderator or admin)
router.post(
  '/',
  requireModeratorOrAdmin,
  aiDraftController.createAIDraft
);

// Update AI draft (moderator or admin)
router.put(
  '/:id',
  requireModeratorOrAdmin,
  aiDraftController.updateAIDraft
);

// Delete AI draft (admin only)
router.delete(
  '/:id',
  requireAdmin,
  aiDraftController.deleteAIDraft
);

// Review AI draft (approve/reject) (moderator or admin)
router.patch(
  '/:id/review',
  requireModeratorOrAdmin,
  aiDraftController.reviewAIDraft
);

// Publish AI draft (convert to opportunity) (moderator or admin)
router.post(
  '/:id/publish',
  requireModeratorOrAdmin,
  aiDraftController.publishAIDraft
);

export default router;

