import { Router } from 'express';
import { sendSuccess } from '../utils/send-response';
import authRoutes from './auth-routes';
import opportunityRoutes from './opportunity-routes';
import opportunityTypeRoutes from './opportunity-type-routes';
import adminOpportunityRoutes from './admin-opportunity-routes';
import crawlSourceRoutes from './crawl-source-routes';
import aiDraftRoutes from './ai-draft-routes';
import agentRoutes from './agent';
import onboardingRoutes from './onboarding';
import userManagementRoutes from './user-management-routes';

const router = Router();

router.get('/', (req, res) => {
  return sendSuccess(
    res,
    {
      message: 'Ambitful AI API',
      version: '1.0.0',
      status: 'active',
      timestamp: new Date().toISOString(),
    },
    'API is running successfully'
  );
});

// Route modules
router.use('/auth', authRoutes);
router.use('/opportunities', opportunityRoutes);
router.use('/opportunity-types', opportunityTypeRoutes);
router.use('/admin/opportunities', adminOpportunityRoutes);
router.use('/crawl-sources', crawlSourceRoutes);
router.use('/ai-drafts', aiDraftRoutes);
router.use('/agent', agentRoutes);
router.use('/onboarding', onboardingRoutes);
router.use('/user-management', userManagementRoutes);

export default router;
