import { prisma } from '../config/database';
import { vectorStoreService } from './vector-store-service';
import logger from '../config/logger';
import {
  OnboardingStepOneData,
  OnboardingStepTwoData,
  CompleteOnboardingData,
} from '../schemas/onboarding';
import { NotFoundException } from '../utils/http-exception';

interface OnboardingResult {
  userId: string;
  isOnboardingComplete: boolean;
  completedAt?: Date;
}

class OnboardingService {
  async updateStepOne(
    userId: string,
    data: OnboardingStepOneData
  ): Promise<OnboardingResult> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Extract preferred locations from location and remoteWork
    const preferredLocations: string[] = [];
    if (data.location && data.location.trim()) {
      preferredLocations.push(data.location.trim());
    }
    if (data.remoteWork) {
      preferredLocations.push('Remote');
    }

    // Update user profile with onboarding step 1 data
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        jobFunction: data.jobFunction,
        preferredLocations,
        workAuthorization: data.workAuthorization,
        remoteWork: data.remoteWork,
        updatedAt: new Date(),
      },
    });

    // Create or update user opportunity types
    if (data.jobTypes && data.jobTypes.length > 0) {
      // First, remove existing opportunity types for this user
      await prisma.userOpportunityType.deleteMany({
        where: { userId },
      });

      // Get or create opportunity types
      const opportunityTypes = await Promise.all(
        data.jobTypes.map(async (typeName) => {
          let opportunityType = await prisma.opportunityType.findUnique({
            where: { name: typeName },
          });

          if (!opportunityType) {
            opportunityType = await prisma.opportunityType.create({
              data: { name: typeName },
            });
          }

          return opportunityType;
        })
      );

      // Create new UserOpportunityType records
      await prisma.userOpportunityType.createMany({
        data: opportunityTypes.map((type) => ({
          userId,
          opportunityTypeId: type.id,
        })),
      });
    }

    logger.info(`Onboarding step 1 completed for user: ${userId}`);

    return {
      userId: updatedUser.id,
      isOnboardingComplete: updatedUser.isOnboardingComplete,
      completedAt: updatedUser.onboardingCompletedAt || undefined,
    };
  }

  async updateStepTwo(
    userId: string,
    data: OnboardingStepTwoData
  ): Promise<OnboardingResult> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Update user with resume URL if provided
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.resumeUrl && { resumeUrl: data.resumeUrl }),
        updatedAt: new Date(),
      },
    });

    logger.info(`Onboarding step 2 completed for user: ${userId}`);

    return {
      userId: updatedUser.id,
      isOnboardingComplete: updatedUser.isOnboardingComplete,
      completedAt: updatedUser.onboardingCompletedAt || undefined,
    };
  }

  async completeOnboarding(
    userId: string,
    data: CompleteOnboardingData
  ): Promise<OnboardingResult> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        userOpportunityTypes: {
          include: {
            opportunityType: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if onboarding is already complete
    if (user.isOnboardingComplete) {
      return {
        userId: user.id,
        isOnboardingComplete: true,
        completedAt: user.onboardingCompletedAt || undefined,
      };
    }

    // Extract preferred locations
    const preferredLocations: string[] = [];
    if (data.location && data.location.trim()) {
      preferredLocations.push(data.location.trim());
    }
    if (data.remoteWork) {
      preferredLocations.push('Remote');
    }

    // Update user profile with all onboarding data and mark as complete
    const completedAt = new Date();
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        jobFunction: data.jobFunction,
        preferredLocations,
        workAuthorization: data.workAuthorization,
        remoteWork: data.remoteWork,
        ...(data.resumeUrl && { resumeUrl: data.resumeUrl }),
        isOnboardingComplete: true,
        onboardingCompletedAt: completedAt,
        updatedAt: new Date(),
      },
    });

    // Handle job types
    if (data.jobTypes && data.jobTypes.length > 0) {
      // Remove existing opportunity types for this user
      await prisma.userOpportunityType.deleteMany({
        where: { userId },
      });

      // Get or create opportunity types
      const opportunityTypes = await Promise.all(
        data.jobTypes.map(async (typeName) => {
          let opportunityType = await prisma.opportunityType.findUnique({
            where: { name: typeName },
          });

          if (!opportunityType) {
            opportunityType = await prisma.opportunityType.create({
              data: { name: typeName },
            });
          }

          return opportunityType;
        })
      );

      // Create new UserOpportunityType records
      await prisma.userOpportunityType.createMany({
        data: opportunityTypes.map((type) => ({
          userId,
          opportunityTypeId: type.id,
        })),
      });
    }

    // Index user data in vector store for personalized AI recommendations
    try {
      await vectorStoreService.indexUserProfile(userId);
      logger.info(`User profile indexed in vector store: ${userId}`);
    } catch (vectorError) {
      logger.warn(
        `Failed to index user profile in vector store: ${userId}`,
        vectorError
      );
      // Don't fail onboarding if vector indexing fails
    }

    logger.info(`Onboarding completed for user: ${userId}`);

    return {
      userId: updatedUser.id,
      isOnboardingComplete: true,
      completedAt: completedAt,
    };
  }

  async getOnboardingStatus(userId: string): Promise<{
    isComplete: boolean;
    completedAt?: Date;
    profileData?: {
      jobFunction?: string;
      preferredLocations?: string[];
      workAuthorization?: string;
      remoteWork?: boolean;
      resumeUrl?: string;
    };
  }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        isOnboardingComplete: true,
        onboardingCompletedAt: true,
        jobFunction: true,
        preferredLocations: true,
        workAuthorization: true,
        remoteWork: true,
        resumeUrl: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      isComplete: user.isOnboardingComplete,
      completedAt: user.onboardingCompletedAt || undefined,
      profileData: {
        jobFunction: user.jobFunction || undefined,
        preferredLocations: user.preferredLocations || undefined,
        workAuthorization: user.workAuthorization || undefined,
        remoteWork: user.remoteWork,
        resumeUrl: user.resumeUrl || undefined,
      },
    };
  }

  async skipOnboarding(userId: string): Promise<OnboardingResult> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const completedAt = new Date();
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        isOnboardingComplete: true,
        onboardingCompletedAt: completedAt,
        updatedAt: new Date(),
      },
    });

    logger.info(`Onboarding skipped for user: ${userId}`);

    return {
      userId: updatedUser.id,
      isOnboardingComplete: true,
      completedAt: completedAt,
    };
  }
}

export const onboardingService = new OnboardingService();
export default onboardingService;
