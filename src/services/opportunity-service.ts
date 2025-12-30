import { prisma } from '../config/database';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '../utils/http-exception';
import logger from '../config/logger';
import {
  CreateOpportunityData,
  UpdateOpportunityData,
  OpportunityQueryParams,
  SavedJobData,
  ApplicationData,
  UpdateApplicationData,
  OpportunityResponse,
  OpportunityListResponse,
} from '../schemas/opportunity';

class OpportunityService {
  async createOpportunity(
    data: CreateOpportunityData
  ): Promise<OpportunityResponse> {
    const { opportunityTypeIds, deadline, author, ...opportunityData } = data;

    // Verify opportunity types exist
    const existingTypes = await prisma.opportunityType.findMany({
      where: { id: { in: opportunityTypeIds } },
    });

    if (existingTypes.length !== opportunityTypeIds.length) {
      throw new BadRequestException(
        'One or more opportunity types do not exist'
      );
    }

    const opportunity = await prisma.opportunity.create({
      data: {
        ...opportunityData,
        deadline: new Date(deadline),
        author: author || 'System',
        opportunityCategories: {
          create: opportunityTypeIds.map((typeId) => ({
            opportunityTypeId: typeId,
          })),
        },
      },
      include: {
        opportunityCategories: {
          include: {
            opportunityType: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        _count: {
          select: {
            applications: true,
            savedJobs: true,
          },
        },
      },
    });

    logger.info('Opportunity created successfully', {
      opportunityId: opportunity.id,
      title: opportunity.title,
    });

    return opportunity as OpportunityResponse;
  }

  async getOpportunities(
    params: OpportunityQueryParams
  ): Promise<OpportunityListResponse> {
    const {
      page,
      limit,
      search,
      locations,
      isRemote,
      experienceLevel,
      compensationType,
      opportunityTypeIds,
      deadline,
      sortBy,
      sortOrder,
    } = params;

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {
      isActive: true,
    };

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { organization: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (locations) {
      const locationArray = locations.split(',').map((loc) => loc.trim());
      where.locations = {
        hasSome: locationArray,
      };
    }

    if (isRemote !== undefined) {
      where.isRemote = isRemote;
    }

    if (experienceLevel) {
      where.experienceLevel = experienceLevel;
    }

    if (compensationType) {
      where.compensationType = compensationType;
    }

    if (opportunityTypeIds) {
      const typeIdArray = opportunityTypeIds.split(',').map((id) => id.trim());
      where.opportunityCategories = {
        some: {
          opportunityTypeId: { in: typeIdArray },
        },
      };
    }

    if (deadline) {
      const now = new Date();
      let deadlineFilter: Date;

      switch (deadline) {
        case 'week':
          deadlineFilter = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          deadlineFilter = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
          break;
        case 'quarter':
          deadlineFilter = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
          break;
        default:
          deadlineFilter = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      }

      where.deadline = {
        gte: now,
        lte: deadlineFilter,
      };
    } else {
      // Only show opportunities with future deadlines
      where.deadline = { gte: new Date() };
    }

    // Build orderBy clause
    const orderBy: any = {};
    orderBy[sortBy] = sortOrder;

    const [opportunities, total] = await Promise.all([
      prisma.opportunity.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          opportunityCategories: {
            include: {
              opportunityType: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          _count: {
            select: {
              applications: true,
              savedJobs: true,
            },
          },
        },
      }),
      prisma.opportunity.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      opportunities: opportunities as OpportunityResponse[],
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  async getOpportunityById(id: string, incrementViews: boolean = true): Promise<OpportunityResponse> {
    const opportunity = await prisma.opportunity.findUnique({
      where: { id },
      include: {
        opportunityCategories: {
          include: {
            opportunityType: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        _count: {
          select: {
            applications: true,
            savedJobs: true,
          },
        },
      },
    });

    if (!opportunity) {
      throw new NotFoundException('Opportunity not found');
    }

    // Increment view count if requested (default behavior)
    if (incrementViews) {
      await prisma.opportunity.update({
        where: { id },
        data: { views: { increment: 1 } },
      });
      
      // Update the opportunity object to reflect the new view count
      opportunity.views += 1;
    }

    return opportunity as OpportunityResponse;
  }

  async updateOpportunity(
    id: string,
    data: UpdateOpportunityData
  ): Promise<OpportunityResponse> {
    const existingOpportunity = await prisma.opportunity.findUnique({
      where: { id },
    });

    if (!existingOpportunity) {
      throw new NotFoundException('Opportunity not found');
    }

    const { opportunityTypeIds, deadline, author, ...updateData } = data;

    // Handle opportunity types update
    if (opportunityTypeIds && opportunityTypeIds.length > 0) {
      const existingTypes = await prisma.opportunityType.findMany({
        where: { id: { in: opportunityTypeIds } },
      });

      if (existingTypes.length !== opportunityTypeIds.length) {
        throw new BadRequestException(
          'One or more opportunity types do not exist'
        );
      }

      // Delete existing categories and create new ones
      await prisma.opportunityCategory.deleteMany({
        where: { opportunityId: id },
      });
    }

    const opportunity = await prisma.opportunity.update({
      where: { id },
      data: {
        ...updateData,
        ...(deadline && { deadline: new Date(deadline) }),
        ...(author !== undefined && { author }),
        ...(opportunityTypeIds && {
          opportunityCategories: {
            create: opportunityTypeIds.map((typeId) => ({
              opportunityTypeId: typeId,
            })),
          },
        }),
      },
      include: {
        opportunityCategories: {
          include: {
            opportunityType: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        _count: {
          select: {
            applications: true,
            savedJobs: true,
          },
        },
      },
    });

    logger.info('Opportunity updated successfully', {
      opportunityId: opportunity.id,
      title: opportunity.title,
    });

    return opportunity as OpportunityResponse;
  }

  async deleteOpportunity(id: string): Promise<void> {
    const opportunity = await prisma.opportunity.findUnique({
      where: { id },
    });

    if (!opportunity) {
      throw new NotFoundException('Opportunity not found');
    }

    await prisma.opportunity.delete({
      where: { id },
    });

    logger.info('Opportunity deleted successfully', {
      opportunityId: id,
      title: opportunity.title,
    });
  }

  // Saved Jobs Methods
  async saveJob(
    userId: string,
    data: SavedJobData
  ): Promise<{ message: string }> {
    const { opportunityId } = data;

    // Check if opportunity exists
    const opportunity = await prisma.opportunity.findUnique({
      where: { id: opportunityId },
    });

    if (!opportunity) {
      throw new NotFoundException('Opportunity not found');
    }

    // Check if already saved
    const existingSave = await prisma.savedJob.findUnique({
      where: {
        userId_opportunityId: {
          userId,
          opportunityId,
        },
      },
    });

    if (existingSave) {
      throw new ConflictException('Opportunity already saved');
    }

    await prisma.savedJob.create({
      data: {
        userId,
        opportunityId,
      },
    });

    logger.info('Job saved successfully', {
      userId,
      opportunityId,
    });

    return { message: 'Job saved successfully' };
  }

  async unsaveJob(
    userId: string,
    opportunityId: string
  ): Promise<{ message: string }> {
    const savedJob = await prisma.savedJob.findUnique({
      where: {
        userId_opportunityId: {
          userId,
          opportunityId,
        },
      },
    });

    if (!savedJob) {
      throw new NotFoundException('Saved job not found');
    }

    await prisma.savedJob.delete({
      where: {
        userId_opportunityId: {
          userId,
          opportunityId,
        },
      },
    });

    logger.info('Job unsaved successfully', {
      userId,
      opportunityId,
    });

    return { message: 'Job unsaved successfully' };
  }

  async getUserSavedJobs(userId: string, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const [savedJobs, total] = await Promise.all([
      prisma.savedJob.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { savedAt: 'desc' },
        include: {
          opportunity: {
            include: {
              opportunityCategories: {
                include: {
                  opportunityType: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
              _count: {
                select: {
                  applications: true,
                  savedJobs: true,
                },
              },
            },
          },
        },
      }),
      prisma.savedJob.count({ where: { userId } }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      savedJobs: savedJobs.map((save) => ({
        id: save.id,
        savedAt: save.savedAt,
        opportunity: save.opportunity,
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  // Applications Methods
  async applyToOpportunity(userId: string, data: ApplicationData) {
    const { opportunityId, coverLetter, resumeUrl } = data;

    // Check if opportunity exists and is active
    const opportunity = await prisma.opportunity.findUnique({
      where: { id: opportunityId },
    });

    if (!opportunity) {
      throw new NotFoundException('Opportunity not found');
    }

    if (!opportunity.isActive) {
      throw new BadRequestException('This opportunity is no longer active');
    }

    if (opportunity.deadline < new Date()) {
      throw new BadRequestException('Application deadline has passed');
    }

    // Check if already applied
    const existingApplication = await prisma.application.findUnique({
      where: {
        userId_opportunityId: {
          userId,
          opportunityId,
        },
      },
    });

    if (existingApplication) {
      throw new ConflictException(
        'You have already applied to this opportunity'
      );
    }

    const application = await prisma.application.create({
      data: {
        userId,
        opportunityId,
        coverLetter,
        resumeUrl,
      },
      include: {
        opportunity: {
          select: {
            id: true,
            title: true,
            organization: true,
          },
        },
      },
    });

    logger.info('Application submitted successfully', {
      userId,
      opportunityId,
      applicationId: application.id,
    });

    return application;
  }

  async getUserApplications(
    userId: string,
    page: number = 1,
    limit: number = 10
  ) {
    const skip = (page - 1) * limit;

    const [applications, total] = await Promise.all([
      prisma.application.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { appliedAt: 'desc' },
        include: {
          opportunity: {
            include: {
              opportunityCategories: {
                include: {
                  opportunityType: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
            },
          },
        },
      }),
      prisma.application.count({ where: { userId } }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      applications,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  async getApplicationById(userId: string, applicationId: string) {
    const application = await prisma.application.findFirst({
      where: {
        id: applicationId,
        userId,
      },
      include: {
        opportunity: {
          include: {
            opportunityCategories: {
              include: {
                opportunityType: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    return application;
  }

  async updateApplication(
    userId: string,
    applicationId: string,
    data: UpdateApplicationData
  ) {
    const existingApplication = await prisma.application.findFirst({
      where: {
        id: applicationId,
        userId,
      },
    });

    if (!existingApplication) {
      throw new NotFoundException('Application not found');
    }

    const application = await prisma.application.update({
      where: { id: applicationId },
      data,
      include: {
        opportunity: {
          select: {
            id: true,
            title: true,
            organization: true,
          },
        },
      },
    });

    logger.info('Application updated successfully', {
      userId,
      applicationId,
    });

    return application;
  }

  async withdrawApplication(
    userId: string,
    applicationId: string
  ): Promise<{ message: string }> {
    const application = await prisma.application.findFirst({
      where: {
        id: applicationId,
        userId,
      },
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    await prisma.application.update({
      where: { id: applicationId },
      data: { status: 'WITHDRAWN' },
    });

    logger.info('Application withdrawn successfully', {
      userId,
      applicationId,
    });

    return { message: 'Application withdrawn successfully' };
  }

  // Admin-specific methods
  async getOpportunityStats() {
    const [
      total,
      published,
      draft,
      archived,
      totalApplications,
      recentApplications
    ] = await Promise.all([
      prisma.opportunity.count(),
      prisma.opportunity.count({ where: { isActive: true } }),
      prisma.opportunity.count({ where: { isActive: false } }),
      0, // archived - we don't have archived status yet, just using 0
      prisma.application.count(),
      prisma.application.count({
        where: {
          appliedAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
          }
        }
      })
    ]);

    return {
      total,
      published,
      draft,
      archived,
      totalApplications,
      recentApplications,
    };
  }
}

export const opportunityService = new OpportunityService();
export default opportunityService;
