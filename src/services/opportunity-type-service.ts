import { prisma } from '../config/database';
import {
  NotFoundException,
  ConflictException,
} from '../utils/http-exception';
import logger from '../config/logger';

class OpportunityTypeService {
  async createOpportunityType(name: string) {
    const existingType = await prisma.opportunityType.findUnique({
      where: { name }
    });

    if (existingType) {
      throw new ConflictException('Opportunity type already exists');
    }

    const opportunityType = await prisma.opportunityType.create({
      data: { name }
    });

    logger.info('Opportunity type created successfully', {
      opportunityTypeId: opportunityType.id,
      name: opportunityType.name,
    });

    return opportunityType;
  }

  async getOpportunityTypes() {
    const opportunityTypes = await prisma.opportunityType.findMany({
      orderBy: { name: 'asc' }
    });

    return opportunityTypes;
  }

  async deleteOpportunityType(id: string): Promise<void> {
    const existingType = await prisma.opportunityType.findUnique({
      where: { id }
    });

    if (!existingType) {
      throw new NotFoundException('Opportunity type not found');
    }

    const opportunitiesWithType = await prisma.opportunity.findFirst({
      where: { 
        opportunityCategories: {
          some: { opportunityTypeId: id }
        }
      }
    });

    if (opportunitiesWithType) {
      throw new ConflictException('Cannot delete opportunity type that has associated opportunities');
    }

    await prisma.opportunityType.delete({
      where: { id }
    });

    logger.info('Opportunity type deleted successfully', {
      opportunityTypeId: id,
      name: existingType.name,
    });
  }
}

export const opportunityTypeService = new OpportunityTypeService();
export default opportunityTypeService;