import { z } from 'zod';

export const onboardingStepOneSchema = z.object({
  jobFunction: z.string().min(1, 'Job function is required'),
  jobTypes: z.array(z.string()).min(1, 'Select at least one job type'),
  location: z.string().optional(),
  remoteWork: z.boolean().default(false),
  workAuthorization: z.string().optional(),
});

export const onboardingStepTwoSchema = z.object({
  resumeUrl: z.string().url().optional(),
});

export const completeOnboardingSchema = onboardingStepOneSchema.merge(onboardingStepTwoSchema);

// Inferred types
export type OnboardingStepOneData = z.infer<typeof onboardingStepOneSchema>;
export type OnboardingStepTwoData = z.infer<typeof onboardingStepTwoSchema>;
export type CompleteOnboardingData = z.infer<typeof completeOnboardingSchema>;

export interface OnboardingResponse {
  success: boolean;
  message: string;
  data?: {
    userId: string;
    isOnboardingComplete: boolean;
    completedAt?: Date;
  };
}