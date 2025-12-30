import { prisma } from '../config/database';
import { NotFoundException } from '../utils/http-exception';
import { OpportunityQueryParams } from '../schemas/opportunity';

class AdminOpportunityService {
  async getAdminOpportunities(filters: OpportunityQueryParams) {
    const { page, limit, search, locations, isRemote, experienceLevel, opportunityTypeIds } = filters;
    
    const skip = (page - 1) * limit;
    
    const where: any = {};
    
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { organization: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }
    
    if (locations) {
      where.locations = {
        hasSome: locations.split(',').map(loc => loc.trim()),
      };
    }
    
    if (isRemote !== undefined) {
      where.isRemote = isRemote;
    }
    
    if (experienceLevel) {
      where.experienceLevel = experienceLevel;
    }
    
    if (opportunityTypeIds) {
      const typeIds = opportunityTypeIds.split(',').map(id => id.trim());
      where.opportunityCategories = {
        some: {
          opportunityTypeId: {
            in: typeIds,
          },
        },
      };
    }

    const [opportunities, total] = await Promise.all([
      prisma.opportunity.findMany({
        where,
        skip,
        take: limit,
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
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.opportunity.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    // Transform opportunities for admin data table
    const transformedOpportunities = opportunities.map((opp) => ({
      id: opp.id,
      title: opp.title,
      category: opp.opportunityCategories?.[0]?.opportunityType?.name || 'General',
      author: opp.author || 'System',
      clicks: opp.views || 0,
      dateAdded: opp.createdAt.toISOString().split('T')[0],
      status: opp.isActive ? 'published' : 'draft',
    }));

    return {
      opportunities: transformedOpportunities,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage,
        hasPreviousPage,
      },
    };
  }

  async getOpportunityStats() {
    const [total, published, draft, archived, totalApplications] = await Promise.all([
      prisma.opportunity.count(),
      prisma.opportunity.count({ where: { isActive: true } }),
      prisma.opportunity.count({ where: { isActive: false } }),
      prisma.opportunity.count({ where: { isActive: false } }), // Assuming archived is same as draft for now
      prisma.application.count(),
    ]);

    const recentApplications = await prisma.application.count({
      where: {
        appliedAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        },
      },
    });

    return {
      total,
      published,
      draft,
      archived,
      totalApplications,
      recentApplications,
    };
  }

  async updateOpportunityStatus(id: string, status: 'published' | 'draft' | 'archived') {
    const opportunity = await prisma.opportunity.findUnique({
      where: { id },
    });

    if (!opportunity) {
      throw new NotFoundException('Opportunity not found');
    }

    const isActive = status === 'published';

    return await prisma.opportunity.update({
      where: { id },
      data: { 
        isActive,
        updatedAt: new Date(),
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
  }

  async deleteOpportunity(id: string) {
    const opportunity = await prisma.opportunity.findUnique({
      where: { id },
    });

    if (!opportunity) {
      throw new NotFoundException('Opportunity not found');
    }

    // Delete related records first
    await prisma.opportunityCategory.deleteMany({
      where: { opportunityId: id },
    });

    await prisma.application.deleteMany({
      where: { opportunityId: id },
    });

    await prisma.savedJob.deleteMany({
      where: { opportunityId: id },
    });

    // Delete the opportunity
    return await prisma.opportunity.delete({
      where: { id },
    });
  }
}

export const adminOpportunityService = new AdminOpportunityService();