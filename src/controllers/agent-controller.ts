import { NextFunction, Request, Response } from 'express';
import { aiAgentService, ChatMessage } from '../services/ai-agent-service';
import { sendSuccess, sendError } from '../utils/send-response';
import logger from '../config/logger';
import { z } from 'zod';

const chatMessageSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty').max(1000, 'Message too long'),
  conversationHistory: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
    timestamp: z.string().datetime(),
  })).optional().default([]),
});

class AgentController {
  chat = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      const validatedData = chatMessageSchema.parse(req.body);

      if (!userId) {
        return sendError(res, 'User authentication required', 401);
      }

      // Convert string timestamps back to Date objects
      const conversationHistory: ChatMessage[] = validatedData.conversationHistory.map(msg => ({
        ...msg,
        timestamp: new Date(msg.timestamp),
      }));

      const response = await aiAgentService.processMessage(
        validatedData.message,
        userId,
        conversationHistory
      );

      return sendSuccess(res, response, 'Message processed successfully');
    } catch (error) {
      logger.error('Error in agent chat:', error);
      next(error);
    }
  };

  health = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const health = await aiAgentService.getAgentHealth();
      return sendSuccess(res, health, 'Agent health retrieved successfully');
    } catch (error) {
      logger.error('Error getting agent health:', error);
      next(error);
    }
  };

  initializeVectorStore = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return sendError(res, 'User authentication required', 401);
      }

      // Check if user is admin
      if (req.user?.role !== 'ADMIN') {
        return sendError(res, 'Admin access required', 403);
      }

      await aiAgentService.initializeVectorStore();
      return sendSuccess(res, { initialized: true }, 'Vector store initialized successfully');
    } catch (error) {
      logger.error('Error initializing vector store:', error);
      next(error);
    }
  };

  indexUserData = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return sendError(res, 'User authentication required', 401);
      }

      await aiAgentService.indexUserData(userId);
      return sendSuccess(res, { indexed: true }, 'User data indexed successfully');
    } catch (error) {
      logger.error('Error indexing user data:', error);
      next(error);
    }
  };
}

export const agentController = new AgentController();
export default agentController;