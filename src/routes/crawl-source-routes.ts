import { Router } from 'express';
import { crawlSourceController } from '../controllers/crawl-source-controller';
import { authenticate } from '../middleware/auth';
import {
  requireAdmin,
  requireModeratorOrAdmin,
} from '../middleware/role-guard';

const router = Router();

// All crawl source routes require authentication
router.use(authenticate);

// Get all crawl sources (moderator or admin)
router.get('/', requireModeratorOrAdmin, crawlSourceController.getCrawlSources);

// Get crawl source by ID (moderator or admin)
router.get(
  '/:id',
  requireModeratorOrAdmin,
  crawlSourceController.getCrawlSourceById
);

// Create crawl source (moderator or admin)
router.post(
  '/',
  requireModeratorOrAdmin,
  crawlSourceController.createCrawlSource
);

// Update crawl source (moderator or admin)
router.put(
  '/:id',
  requireModeratorOrAdmin,
  crawlSourceController.updateCrawlSource
);

// Delete crawl source (admin only)
router.delete('/:id', requireAdmin, crawlSourceController.deleteCrawlSource);

// Trigger crawl (moderator or admin)
router.post(
  '/:id/trigger',
  requireModeratorOrAdmin,
  crawlSourceController.triggerCrawl
);

export default router;
