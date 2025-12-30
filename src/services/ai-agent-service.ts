import { createAgent } from 'langchain';
import {
  searchOpportunities,
  getUserProfile,
  getOpportunityDetails,
  saveOpportunity,
  getSavedJobs,
  provideCareerAdvice,
} from './agent-tools';
import { vectorStoreService } from './vector-store-service';
import logger from '../config/logger';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface AgentResponse {
  message: string;
  data?: any;
  suggestions?: string[];
}

class AIAgentService {
  private agent: any | null = null;

  constructor() {
    // Tools are now defined as functions and will be passed directly to createAgent
  }

  async initializeAgent(_userId?: string): Promise<void> {
    try {
      // Create the agent using the new LangChain API
      this.agent = createAgent({
        model: 'gpt-4-turbo-preview',
        tools: [
          searchOpportunities,
          getUserProfile,
          getOpportunityDetails,
          saveOpportunity,
          getSavedJobs,
          provideCareerAdvice,
        ],
      });

      logger.info('AI Agent initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize AI agent:', error);
      throw error;
    }
  }

  async processMessage(
    message: string,
    userId?: string,
    conversationHistory: ChatMessage[] = []
  ): Promise<AgentResponse> {
    try {
      if (!this.agent) {
        await this.initializeAgent();
      }

      // Build context from conversation history
      let contextualMessage = message;
      if (conversationHistory.length > 0) {
        const recentHistory = conversationHistory
          .slice(-3) // Last 3 messages for context
          .map((msg) => `${msg.role}: ${msg.content}`)
          .join('\n');

        contextualMessage = `Previous conversation:\n${recentHistory}\n\nCurrent message: ${message}`;
      }

      // Add system context about the platform
      const systemContext = `You are Ambitful AI, a career assistant that helps users find opportunities including jobs, internships, scholarships, fellowships, and more.

Key capabilities:
- Search for opportunities based on user preferences and queries
- Provide detailed information about specific opportunities
- Save opportunities to user's list
- Retrieve saved opportunities
- Offer personalized career advice
- Access user profile information

When showing opportunities, include relevant details like:
- Title and organization
- Locations (can be multiple locations or remote)
- Compensation and compensation type (salary, stipend, scholarship amount, etc.)
- Requirements and benefits
- Experience level and duration
- Application deadline and eligibility criteria

Always be helpful, professional, and focus on career-related assistance.`;


      // Execute the agent with the new invoke pattern
      const result = await this.agent!.invoke({
        messages: [
          {
            role: 'system',
            content: systemContext,
          },
          {
            role: 'user', 
            content: contextualMessage,
          }
        ],
        userId, // Pass userId as a separate parameter for tools
      });

      // Process the response
      const response: AgentResponse = {
        message: result.messages?.[result.messages.length - 1]?.content || result.content || 'No response from agent',
      };

      // Try to parse JSON data if present in the response
      try {
        const messageContent = response.message;
        const jsonMatch = messageContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const data = JSON.parse(jsonMatch[0]);
          response.data = data;

          // Clean the message to remove JSON
          response.message = messageContent.replace(jsonMatch[0], '').trim();
        }
      } catch {
        // If JSON parsing fails, keep original message
      }

      // Generate helpful suggestions
      response.suggestions = this.generateSuggestions(message, response);

      logger.info('Agent processed message successfully', {
        userId,
        message: message.substring(0, 100),
      });
      return response;
    } catch (error) {
      logger.error('Error processing message with AI agent:', error);
      return {
        message:
          'I apologize, but I encountered an error while processing your request. Please try rephrasing your question or try again later.',
        suggestions: [
          'Try searching for specific job roles',
          'Ask about your saved opportunities',
          'Request career advice for your field',
        ],
      };
    }
  }

  private generateSuggestions(
    userMessage: string,
    _response: AgentResponse
  ): string[] {
    const message = userMessage.toLowerCase();
    const suggestions: string[] = [];

    if (
      message.includes('job') ||
      message.includes('opportunity') ||
      message.includes('internship') ||
      message.includes('scholarship')
    ) {
      suggestions.push(
        'Tell me more about specific requirements for this role'
      );
      suggestions.push('Save this opportunity to my list');
      suggestions.push('Find similar opportunities');
    }

    if (message.includes('career') || message.includes('advice')) {
      suggestions.push('What skills should I develop for my field?');
      suggestions.push('How can I improve my job application?');
      suggestions.push('Show me market trends in my industry');
    }

    if (message.includes('remote') || message.includes('location')) {
      suggestions.push('Find remote opportunities in my field');
      suggestions.push('Show me opportunities in specific cities');
      suggestions.push('What are the best locations for my profession?');
    }

    if (
      message.includes('compensation') ||
      message.includes('salary') ||
      message.includes('stipend')
    ) {
      suggestions.push('Compare compensation across different opportunities');
      suggestions.push('Show me high-paying roles in my field');
      suggestions.push('What factors affect compensation in my industry?');
    }

    // Default suggestions if none match
    if (suggestions.length === 0) {
      suggestions.push(
        'Search for opportunities in my field',
        'Show my saved opportunities',
        'Give me career advice'
      );
    }

    return suggestions.slice(0, 3); // Limit to 3 suggestions
  }

  async initializeVectorStore(): Promise<void> {
    try {
      await vectorStoreService.initializeVectorStore();
      logger.info('Vector store initialized for AI agent');
    } catch (error) {
      logger.error('Failed to initialize vector store for AI agent:', error);
      throw error;
    }
  }

  async indexUserData(userId: string): Promise<void> {
    try {
      await vectorStoreService.indexUserProfile(userId);
      logger.info(`User data indexed for agent: ${userId}`);
    } catch (error) {
      logger.error(`Failed to index user data for agent: ${userId}`, error);
      throw error;
    }
  }

  async getAgentHealth(): Promise<{
    status: string;
    tools: string[];
    vectorStore: boolean;
  }> {
    try {
      const vectorStoreHealthy = await this.checkVectorStoreHealth();

      return {
        status: this.agent ? 'ready' : 'initializing',
        tools: [
          'search_opportunities',
          'get_user_profile', 
          'get_opportunity_details',
          'save_opportunity',
          'get_saved_jobs',
          'career_advice'
        ],
        vectorStore: vectorStoreHealthy,
      };
    } catch (error) {
      logger.error('Error checking agent health:', error);
      return {
        status: 'error',
        tools: [],
        vectorStore: false,
      };
    }
  }

  private async checkVectorStoreHealth(): Promise<boolean> {
    try {
      await vectorStoreService.initializeVectorStore();
      return true;
    } catch {
      return false;
    }
  }
}

export const aiAgentService = new AIAgentService();
export default aiAgentService;
