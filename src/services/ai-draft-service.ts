import { prisma } from '../config/database';
import logger from '../config/logger';
import {
  CreateAIDraftData,
  UpdateAIDraftData,
  AIDraftQueryParams,
  AIDraftResponse,
  AIDraftListResponse,
  AIDraftStatsResponse,
  ReviewAIDraftData,
  PublishAIDraftData,
} from '../schemas/ai-draft';
import {
  NotFoundException,
  BadRequestException,
} from '../utils/http-exception';

class AIDraftService {
  async createAIDraft(data: CreateAIDraftData): Promise<AIDraftResponse> {
    const aiDraft = await prisma.aIDraft.create({
      data: {
        ...data,
        status: 'PENDING',
      },
      include: {
        crawlSource: {
          select: {
            id: true,
            name: true,
            url: true,
          },
        },
      },
    });

    logger.info('AI draft created successfully', {
      aiDraftId: aiDraft.id,
      title: aiDraft.title,
    });

    return aiDraft as AIDraftResponse;
  }

  async getAIDrafts(filters: AIDraftQueryParams): Promise<AIDraftListResponse> {
    const { page, limit, search, status, crawlSourceId, sortBy, sortOrder } =
      filters;

    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { organization: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (crawlSourceId) {
      where.crawlSourceId = crawlSourceId;
    }

    const [drafts, total] = await Promise.all([
      prisma.aIDraft.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          [sortBy]: sortOrder,
        },
        include: {
          crawlSource: {
            select: {
              id: true,
              name: true,
              url: true,
            },
          },
        },
      }),
      prisma.aIDraft.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      drafts: drafts as AIDraftResponse[],
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

  async getAIDraftById(id: string): Promise<AIDraftResponse> {
    const aiDraft = await prisma.aIDraft.findUnique({
      where: { id },
      include: {
        crawlSource: {
          select: {
            id: true,
            name: true,
            url: true,
          },
        },
      },
    });

    if (!aiDraft) {
      throw new NotFoundException('AI draft not found');
    }

    return aiDraft as AIDraftResponse;
  }

  async updateAIDraft(
    id: string,
    data: UpdateAIDraftData
  ): Promise<AIDraftResponse> {
    const existingDraft = await prisma.aIDraft.findUnique({
      where: { id },
    });

    if (!existingDraft) {
      throw new NotFoundException('AI draft not found');
    }

    const updatedDraft = await prisma.aIDraft.update({
      where: { id },
      data,
      include: {
        crawlSource: {
          select: {
            id: true,
            name: true,
            url: true,
          },
        },
      },
    });

    logger.info('AI draft updated successfully', {
      aiDraftId: updatedDraft.id,
    });

    return updatedDraft as AIDraftResponse;
  }

  async deleteAIDraft(id: string): Promise<void> {
    const existingDraft = await prisma.aIDraft.findUnique({
      where: { id },
    });

    if (!existingDraft) {
      throw new NotFoundException('AI draft not found');
    }

    await prisma.aIDraft.delete({
      where: { id },
    });

    logger.info('AI draft deleted successfully', {
      aiDraftId: id,
    });
  }

  async reviewAIDraft(
    id: string,
    reviewData: ReviewAIDraftData,
    reviewerId: string
  ): Promise<AIDraftResponse> {
    const existingDraft = await prisma.aIDraft.findUnique({
      where: { id },
    });

    if (!existingDraft) {
      throw new NotFoundException('AI draft not found');
    }

    if (existingDraft.status !== 'PENDING') {
      throw new BadRequestException('Only pending drafts can be reviewed');
    }

    if (reviewData.status === 'REJECTED' && !reviewData.rejectionReason) {
      throw new BadRequestException(
        'Rejection reason is required when rejecting a draft'
      );
    }

    const updatedDraft = await prisma.aIDraft.update({
      where: { id },
      data: {
        status: reviewData.status,
        rejectionReason: reviewData.rejectionReason,
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
      },
      include: {
        crawlSource: {
          select: {
            id: true,
            name: true,
            url: true,
          },
        },
      },
    });

    logger.info('AI draft reviewed successfully', {
      aiDraftId: updatedDraft.id,
      status: reviewData.status,
      reviewerId,
    });

    // Auto-publish approved drafts
    if (reviewData.status === 'APPROVED') {
      try {
        // Get default opportunity type
        const defaultOpportunityType = await prisma.opportunityType.findFirst({
          where: { name: 'General' },
        });

        if (defaultOpportunityType) {
          await this.publishAIDraft(id, {
            opportunityTypeIds: [defaultOpportunityType.id],
          });
          logger.info('AI draft auto-published after approval', {
            aiDraftId: id,
          });
        } else {
          logger.warn(
            'Could not auto-publish: Default opportunity type not found',
            { aiDraftId: id }
          );
        }
      } catch (error: any) {
        logger.error('Error auto-publishing approved draft', {
          aiDraftId: id,
          error: error.message,
        });
        // Don't throw - the review was successful even if publish failed
      }
    }

    return updatedDraft as AIDraftResponse;
  }

  async publishAIDraft(
    id: string,
    publishData: PublishAIDraftData
  ): Promise<AIDraftResponse> {
    const existingDraft = await prisma.aIDraft.findUnique({
      where: { id },
    });

    if (!existingDraft) {
      throw new NotFoundException('AI draft not found');
    }

    if (existingDraft.status !== 'APPROVED') {
      throw new BadRequestException('Only approved drafts can be published');
    }

    if (existingDraft.opportunityId) {
      throw new BadRequestException('This draft has already been published');
    }

    // Create the opportunity from the draft
    const opportunity = await prisma.opportunity.create({
      data: {
        title: existingDraft.title,
        organization: existingDraft.organization,
        description: existingDraft.description,
        requirements: existingDraft.requirements,
        benefits: existingDraft.benefits,
        compensation: existingDraft.compensation,
        compensationType: existingDraft.compensationType,
        locations: existingDraft.locations,
        isRemote: existingDraft.isRemote,
        deadline: existingDraft.deadline,
        applicationUrl: existingDraft.applicationUrl,
        contactEmail: existingDraft.contactEmail,
        experienceLevel: existingDraft.experienceLevel,
        duration: existingDraft.duration,
        eligibility: existingDraft.eligibility,
        isActive: true,
        author: 'AI Crawler',
        opportunityCategories: {
          create: publishData.opportunityTypeIds.map((typeId) => ({
            opportunityTypeId: typeId,
          })),
        },
      },
    });

    // Update the draft with the opportunity ID and status
    const updatedDraft = await prisma.aIDraft.update({
      where: { id },
      data: {
        status: 'PUBLISHED',
        opportunityId: opportunity.id,
      },
      include: {
        crawlSource: {
          select: {
            id: true,
            name: true,
            url: true,
          },
        },
      },
    });

    logger.info('AI draft published successfully', {
      aiDraftId: updatedDraft.id,
      opportunityId: opportunity.id,
    });

    return updatedDraft as AIDraftResponse;
  }

  async getAIDraftStats(): Promise<AIDraftStatsResponse> {
    const [total, pending, approved, rejected, published] = await Promise.all([
      prisma.aIDraft.count(),
      prisma.aIDraft.count({ where: { status: 'PENDING' } }),
      prisma.aIDraft.count({ where: { status: 'APPROVED' } }),
      prisma.aIDraft.count({ where: { status: 'REJECTED' } }),
      prisma.aIDraft.count({ where: { status: 'PUBLISHED' } }),
    ]);

    return {
      total,
      pending,
      approved,
      rejected,
      published,
    };
  }
}

export const aiDraftService = new AIDraftService();
export default aiDraftService;
