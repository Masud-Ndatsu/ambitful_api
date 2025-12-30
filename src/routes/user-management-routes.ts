import { Router } from 'express';
import { userManagementController } from '../controllers/user-management-controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// All user management routes require authentication
router.use(authenticate);

// Get all users (with filters)
router.get('/', userManagementController.getUsers);

// Get user by ID
router.get('/:id', userManagementController.getUserById);

// Create new user
router.post('/', userManagementController.createUser);

// Update user
router.put('/:id', userManagementController.updateUser);

// Delete user
router.delete('/:id', userManagementController.deleteUser);

// Toggle user status (active/inactive)
router.patch('/:id/toggle-status', userManagementController.toggleUserStatus);

export default router;
