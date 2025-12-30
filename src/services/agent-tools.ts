import { tool } from 'langchain';
import * as z from 'zod';
import { prisma } from '../config/database';
import { vectorStoreService } from './vector-store-service';
import logger from '../config/logger';

export const searchOpportunities = tool(
  async ({ query, userId }) => {
    try {
      // Search using vector store for semantic similarity
      const vectorResults = await vectorStoreService.searchSimilarOpportunities(
        query,
        userId,
        5
      );

      if (vectorResults.length === 0) {
        return 'No opportunities found matching your criteria. Try broadening your search terms.';
      }

      // Get full opportunity details
      const opportunityIds = vectorResults
        .map((doc) => doc.metadata.opportunityId)
        .filter(Boolean);
      const opportunities = await prisma.opportunity.findMany({
        where: {
          id: { in: opportunityIds },
          isActive: true,
        },
        include: {
          opportunityCategories: {
            include: {
              opportunityType: true,
            },
          },
        },
        take: 5,
      });

      const results = opportunities.map((opp) => ({
        id: opp.id,
        title: opp.title,
        organization: opp.organization,
        locations: opp.locations,
        compensation: opp.compensation,
        compensationType: opp.compensationType,
        type:
          opp.opportunityCategories
            ?.map((cat) => cat.opportunityType?.name)
            .join(', ') || 'General',
        description: opp.description.substring(0, 200) + '...',
        remote: opp.isRemote,
        deadline: opp.deadline,
      }));

      return JSON.stringify({
        message: `Found ${results.length} opportunities matching your search:`,
        opportunities: results,
      });
    } catch (error) {
      logger.error('Error in searchOpportunities tool:', error);
      return 'Sorry, I encountered an error while searching for opportunities. Please try again.';
    }
  },
  {
    name: 'search_opportunities',
    description:
      'Search for job opportunities based on user query and preferences. Use this when users ask about finding jobs, opportunities, or specific roles.',
    schema: z.object({
      query: z.string().describe('The search query for opportunities'),
      userId: z.string().optional().describe('The user ID for personalization'),
    }),
  }
);

export const getUserProfile = tool(
  async ({ userId }) => {
    try {
      if (!userId) {
        return 'User not authenticated. Please log in to access profile information.';
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          name: true,
          email: true,
          jobFunction: true,
          preferredLocations: true,
          workAuthorization: true,
          remoteWork: true,
        },
      });

      if (!user) {
        return 'User profile not found.';
      }

      return JSON.stringify({
        name: user.name,
        email: user.email,
        jobFunction: user.jobFunction,
        preferredLocations: user.preferredLocations,
        workAuthorization: user.workAuthorization,
        remoteWorkPreference: user.remoteWork,
      });
    } catch (error) {
      logger.error('Error in getUserProfile tool:', error);
      return 'Sorry, I encountered an error while retrieving your profile. Please try again.';
    }
  },
  {
    name: 'get_user_profile',
    description:
      'Get the current user\'s profile information including preferences, skills, and job function.',
    schema: z.object({
      userId: z.string().describe('The user ID to get profile for'),
    }),
  }
);

export const getOpportunityDetails = tool(
  async ({ opportunityId }) => {
    try {
      const opportunity = await prisma.opportunity.findUnique({
        where: { id: opportunityId },
        include: {
          opportunityCategories: {
            include: {
              opportunityType: true,
            },
          },
        },
      });

      if (!opportunity) {
        return 'Opportunity not found.';
      }

      return JSON.stringify({
        id: opportunity.id,
        title: opportunity.title,
        organization: opportunity.organization,
        locations: opportunity.locations,
        description: opportunity.description,
        compensation: opportunity.compensation,
        compensationType: opportunity.compensationType,
        requirements: opportunity.requirements,
        benefits: opportunity.benefits,
        type:
          opportunity.opportunityCategories
            ?.map((cat) => cat.opportunityType?.name)
            .join(', ') || 'General',
        isRemote: opportunity.isRemote,
        experienceLevel: opportunity.experienceLevel,
        deadline: opportunity.deadline,
        duration: opportunity.duration,
        eligibility: opportunity.eligibility,
        applicationUrl: opportunity.applicationUrl,
        contactEmail: opportunity.contactEmail,
        isActive: opportunity.isActive,
        createdAt: opportunity.createdAt,
      });
    } catch (error) {
      logger.error('Error in getOpportunityDetails tool:', error);
      return 'Sorry, I encountered an error while retrieving opportunity details. Please try again.';
    }
  },
  {
    name: 'get_opportunity_details',
    description:
      'Get detailed information about a specific opportunity by its ID.',
    schema: z.object({
      opportunityId: z
        .string()
        .describe('The ID of the opportunity to get details for'),
    }),
  }
);

export const saveOpportunity = tool(
  async ({ opportunityId, userId }) => {
    try {
      if (!userId) {
        return 'User not authenticated. Please log in to save opportunities.';
      }

      // Check if opportunity exists
      const opportunity = await prisma.opportunity.findUnique({
        where: { id: opportunityId },
      });

      if (!opportunity) {
        return 'Opportunity not found.';
      }

      // Check if already saved
      const existingSavedJob = await prisma.savedJob.findUnique({
        where: {
          userId_opportunityId: {
            userId,
            opportunityId,
          },
        },
      });

      if (existingSavedJob) {
        return 'This opportunity is already in your saved jobs list.';
      }

      // Save the opportunity
      await prisma.savedJob.create({
        data: {
          userId,
          opportunityId,
        },
      });

      return `Successfully saved "${opportunity.title}" to your saved jobs list.`;
    } catch (error) {
      logger.error('Error in saveOpportunity tool:', error);
      return 'Sorry, I encountered an error while saving the opportunity. Please try again.';
    }
  },
  {
    name: 'save_opportunity',
    description: 'Save an opportunity to the user\'s saved jobs list.',
    schema: z.object({
      opportunityId: z.string().describe('The ID of the opportunity to save'),
      userId: z.string().describe('The user ID'),
    }),
  }
);

export const getSavedJobs = tool(
  async ({ userId }) => {
    try {
      if (!userId) {
        return 'User not authenticated. Please log in to view saved jobs.';
      }

      const savedJobs = await prisma.savedJob.findMany({
        where: { userId },
        include: {
          opportunity: {
            include: {
              opportunityCategories: {
                include: {
                  opportunityType: true,
                },
              },
            },
          },
        },
        orderBy: { savedAt: 'desc' },
        take: 10,
      });

      if (savedJobs.length === 0) {
        return 'You haven\'t saved any opportunities yet. Start exploring jobs and save the ones that interest you!';
      }

      const results = savedJobs.map((savedJob) => ({
        id: savedJob.opportunity.id,
        title: savedJob.opportunity.title,
        organization: savedJob.opportunity.organization,
        locations: savedJob.opportunity.locations,
        type:
          savedJob.opportunity.opportunityCategories
            ?.map((cat) => cat.opportunityType?.name)
            .join(', ') || 'General',
        savedAt: savedJob.savedAt,
      }));

      return JSON.stringify({
        message: `You have ${results.length} saved opportunities:`,
        savedJobs: results,
      });
    } catch (error) {
      logger.error('Error in getSavedJobs tool:', error);
      return 'Sorry, I encountered an error while retrieving your saved jobs. Please try again.';
    }
  },
  {
    name: 'get_saved_jobs',
    description: 'Get the user\'s list of saved job opportunities.',
    schema: z.object({
      userId: z.string().describe('The user ID'),
    }),
  }
);

export const provideCareerAdvice = tool(
  async ({ query, userId }) => {
    try {
      let userContext = '';
      if (userId) {
        const user = await prisma.user.findUnique({
          where: { id: userId },
        });

        if (user) {
          userContext = `User Profile - Job Function: ${user.jobFunction || 'Not specified'}, Preferred Locations: ${user.preferredLocations?.join(', ') || 'Not specified'}, Remote Work Preference: ${user.remoteWork ? 'Yes' : 'No'}`;
        }
      }

      // This would integrate with your existing AI service or LLM
      // For now, providing structured career advice
      const advice = {
        query: query,
        userContext: userContext,
        advice: [
          'Based on current market trends, consider developing skills in high-demand areas.',
          'Network actively within your industry through professional platforms.',
          'Tailor your applications to each specific role and company.',
          'Keep your skills updated with continuous learning and certifications.',
          'Consider both remote and hybrid opportunities to expand your options.',
        ],
      };

      return JSON.stringify(advice);
    } catch (error) {
      logger.error('Error in provideCareerAdvice tool:', error);
      return 'Sorry, I encountered an error while providing career advice. Please try again.';
    }
  },
  {
    name: 'career_advice',
    description:
      'Provide career advice based on user profile and industry trends.',
    schema: z.object({
      query: z.string().describe('The career advice query'),
      userId: z.string().optional().describe('The user ID for personalization'),
    }),
  }
);
