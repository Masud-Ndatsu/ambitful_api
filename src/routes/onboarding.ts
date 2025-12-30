import express from 'express';
import { onboardingController } from '../controllers/onboarding-controller';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// All onboarding routes require authentication
router.use(authenticate);

// Get onboarding status
router.get('/status', onboardingController.getOnboardingStatus);

// Update onboarding step 1 (job preferences)
router.put('/step-one', onboardingController.updateStepOne);

// Update onboarding step 2 (resume upload)
router.put('/step-two', onboardingController.updateStepTwo);

// Complete onboarding (all steps at once)
router.post('/complete', onboardingController.completeOnboarding);

// Skip onboarding
router.post('/skip', onboardingController.skipOnboarding);

export default router;