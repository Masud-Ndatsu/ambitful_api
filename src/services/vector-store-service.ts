import { PineconeStore } from '@langchain/pinecone';
import { OpenAIEmbeddings } from '@langchain/openai';
import { Document } from '@langchain/core/documents';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { initializePinecone } from '../config/pinecone';
import { config } from '../config/envars';
import { prisma } from '../config/database';
import logger from '../config/logger';

class VectorStoreService {
  private pineconeStore: PineconeStore | null = null;
  private embeddings: OpenAIEmbeddings;
  private textSplitter: RecursiveCharacterTextSplitter;

  constructor() {
    this.embeddings = new OpenAIEmbeddings({
      apiKey: config.OPENAI_API_KEY,
      model: 'text-embedding-3-small',
    });

    this.textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });
  }

  async initializeVectorStore(): Promise<PineconeStore> {
    if (this.pineconeStore) {
      return this.pineconeStore;
    }

    try {
      const pinecone = await initializePinecone();
      const index = pinecone.Index('ambitful-knowledge');

      this.pineconeStore = await PineconeStore.fromExistingIndex(
        this.embeddings,
        {
          pineconeIndex: index,
          maxConcurrency: 5,
        }
      );

      logger.info('Vector store initialized successfully');
      return this.pineconeStore;
    } catch (error) {
      logger.error('Failed to initialize vector store:', error);
      throw error;
    }
  }

  async indexOpportunity(opportunityId: string): Promise<void> {
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
        throw new Error(`Opportunity with id ${opportunityId} not found`);
      }

      const vectorStore = await this.initializeVectorStore();

      // Create document content
      const content = `
        Title: ${opportunity.title}
        Description: ${opportunity.description}
        Organization: ${opportunity.organization}
        Locations: ${opportunity.locations?.join(', ') || 'Not specified'}
        Compensation: ${opportunity.compensation || 'Not specified'}
        Compensation Type: ${opportunity.compensationType || 'Not specified'}
        Type: ${opportunity.opportunityCategories?.map((cat) => cat.opportunityType?.name).join(', ') || 'General'}
        Remote Work: ${opportunity.isRemote ? 'Yes' : 'No'}
        Experience Level: ${opportunity.experienceLevel || 'Not specified'}
        Requirements: ${opportunity.requirements?.join(', ') || 'Not specified'}
        Benefits: ${opportunity.benefits?.join(', ') || 'Not specified'}
        Application Deadline: ${opportunity.deadline?.toISOString() || 'Not specified'}
        Duration: ${opportunity.duration || 'Not specified'}
        Eligibility: ${opportunity.eligibility?.join(', ') || 'Not specified'}
        Status: ${opportunity.isActive ? 'Active' : 'Inactive'}
      `.trim();

      // Split the content into chunks
      const docs = await this.textSplitter.createDocuments(
        [content],
        [
          {
            opportunityId: opportunity.id,
            title: opportunity.title,
            organization: opportunity.organization,
            type: 'opportunity',
            locations: opportunity.locations?.join(', ') || '',
            isActive: opportunity.isActive.toString(),
          },
        ]
      );

      // Add documents to vector store
      await vectorStore.addDocuments(docs);

      logger.info(`Opportunity ${opportunityId} indexed successfully`);
    } catch (error) {
      logger.error(`Failed to index opportunity ${opportunityId}:`, error);
      throw error;
    }
  }

  async indexUserProfile(userId: string): Promise<void> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new Error(`User with id ${userId} not found`);
      }

      const vectorStore = await this.initializeVectorStore();

      // Create user profile document
      const content = `
        User Profile:
        Name: ${user.name}
        Email: ${user.email}
        Job Function: ${user.jobFunction || 'Not specified'}
        Preferred Locations: ${user.preferredLocations?.join(', ') || 'Not specified'}
        Work Authorization: ${user.workAuthorization || 'Not specified'}
        Remote Work Preference: ${user.remoteWork ? 'Yes' : 'No'}
      `.trim();

      const docs = await this.textSplitter.createDocuments(
        [content],
        [
          {
            userId: user.id,
            email: user.email,
            type: 'user_profile',
            jobFunction: user.jobFunction || '',
          },
        ]
      );

      await vectorStore.addDocuments(docs);

      logger.info(`User profile ${userId} indexed successfully`);
    } catch (error) {
      logger.error(`Failed to index user profile ${userId}:`, error);
      throw error;
    }
  }

  async searchSimilarOpportunities(
    query: string,
    userId?: string,
    limit = 10
  ): Promise<Document[]> {
    try {
      const vectorStore = await this.initializeVectorStore();

      // Add user context if provided
      let searchQuery = query;
      if (userId) {
        const user = await prisma.user.findUnique({
          where: { id: userId },
        });

        if (user) {
          searchQuery += ` Job Function: ${user.jobFunction || ''} Preferred Locations: ${user.preferredLocations?.join(', ') || ''} Remote Work: ${user.remoteWork ? 'Yes' : 'No'}`;
        }
      }

      const results = await vectorStore.similaritySearch(searchQuery, limit, {
        type: 'opportunity',
        isActive: 'true',
      });

      return results;
    } catch (error) {
      logger.error('Failed to search similar opportunities:', error);
      throw error;
    }
  }

  async indexAllOpportunities(): Promise<void> {
    try {
      const opportunities = await prisma.opportunity.findMany({
        where: { isActive: true },
      });

      logger.info(`Starting to index ${opportunities.length} opportunities`);

      for (const opportunity of opportunities) {
        await this.indexOpportunity(opportunity.id);
      }

      logger.info('All opportunities indexed successfully');
    } catch (error) {
      logger.error('Failed to index all opportunities:', error);
      throw error;
    }
  }

  async deleteOpportunityFromIndex(opportunityId: string): Promise<void> {
    try {
      await this.initializeVectorStore();

      // Note: Pinecone deletion by metadata filter
      // This would need to be implemented based on Pinecone's capabilities
      logger.info(`Opportunity ${opportunityId} deletion requested`);
    } catch (error) {
      logger.error(
        `Failed to delete opportunity ${opportunityId} from index:`,
        error
      );
      throw error;
    }
  }
}

export const vectorStoreService = new VectorStoreService();
export default vectorStoreService;
