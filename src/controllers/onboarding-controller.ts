import { NextFunction, Request, Response } from 'express';
import { onboardingService } from '../services/onboarding-service';
import { sendSuccess } from '../utils/send-response';
import {
  onboardingStepOneSchema,
  onboardingStepTwoSchema,
  completeOnboardingSchema,
} from '../schemas/onboarding';

class OnboardingController {
  updateStepOne = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new Error('User not authenticated');
      }

      const validatedData = onboardingStepOneSchema.parse(req.body);
      const result = await onboardingService.updateStepOne(
        userId,
        validatedData
      );

      return sendSuccess(res, result, 'Step 1 completed successfully', 200);
    } catch (error) {
      next(error);
    }
  };

  updateStepTwo = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new Error('User not authenticated');
      }

      const validatedData = onboardingStepTwoSchema.parse(req.body);
      const result = await onboardingService.updateStepTwo(
        userId,
        validatedData
      );

      return sendSuccess(res, result, 'Step 2 completed successfully', 200);
    } catch (error) {
      next(error);
    }
  };

  completeOnboarding = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new Error('User not authenticated');
      }

      const validatedData = completeOnboardingSchema.parse(req.body);
      const result = await onboardingService.completeOnboarding(
        userId,
        validatedData
      );

      return sendSuccess(
        res,
        result,
        'Onboarding completed successfully! Welcome to Ambitful.',
        200
      );
    } catch (error) {
      next(error);
    }
  };

  getOnboardingStatus = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new Error('User not authenticated');
      }

      const status = await onboardingService.getOnboardingStatus(userId);
      return sendSuccess(
        res,
        status,
        'Onboarding status retrieved successfully',
        200
      );
    } catch (error) {
      next(error);
    }
  };

  skipOnboarding = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new Error('User not authenticated');
      }

      const result = await onboardingService.skipOnboarding(userId);

      return sendSuccess(res, result, 'Onboarding skipped successfully', 200);
    } catch (error) {
      next(error);
    }
  };
}

export const onboardingController = new OnboardingController();
export default onboardingController;
