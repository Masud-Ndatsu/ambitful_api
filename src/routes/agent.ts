import { Router } from 'express';
import { agentController } from '../controllers/agent-controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// All agent routes require authentication
router.use(authenticate);

// Chat with AI agent
router.post('/chat', agentController.chat);

// Get agent health status
router.get('/health', agentController.health);

// Initialize vector store (Admin only)
router.post('/initialize-vector-store', agentController.initializeVectorStore);

// Index user data for personalization
router.post('/index-user-data', agentController.indexUserData);

export default router;
