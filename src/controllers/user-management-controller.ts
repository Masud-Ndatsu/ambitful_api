import { NextFunction, Request, Response } from 'express';
import { userManagementService } from '../services/user-management-service';
import { sendSuccess } from '../utils/send-response';
import {
  userQueryParamsSchema,
  createUserSchema,
  updateUserSchema,
} from '../schemas/user-management';

class UserManagementController {
  getUsers = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedParams = userQueryParamsSchema.parse(req.query);
      const result = await userManagementService.getUsers(validatedParams);

      return sendSuccess(res, result, 'Users retrieved successfully', 200);
    } catch (error) {
      next(error);
    }
  };

  getUserById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const user = await userManagementService.getUserById(id);

      return sendSuccess(res, user, 'User retrieved successfully', 200);
    } catch (error) {
      next(error);
    }
  };

  createUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = createUserSchema.parse(req.body);
      const user = await userManagementService.createUser(validatedData);

      return sendSuccess(res, user, 'User created successfully', 201);
    } catch (error) {
      next(error);
    }
  };

  updateUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const validatedData = updateUserSchema.parse(req.body);
      const user = await userManagementService.updateUser(id, validatedData);

      return sendSuccess(res, user, 'User updated successfully', 200);
    } catch (error) {
      next(error);
    }
  };

  deleteUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      await userManagementService.deleteUser(id);

      return sendSuccess(res, null, 'User deleted successfully', 200);
    } catch (error) {
      next(error);
    }
  };

  toggleUserStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const user = await userManagementService.toggleUserStatus(id);

      return sendSuccess(res, user, 'User status updated successfully', 200);
    } catch (error) {
      next(error);
    }
  };
}

export const userManagementController = new UserManagementController();
export default userManagementController;