import { NextFunction, Request, Response } from 'express';
import { authService } from '../services/auth-service';
import { sendSuccess } from '../utils/send-response';
import { registerSchema, loginSchema, refreshTokenSchema } from '../schemas/auth';

class AuthController {
  register = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = registerSchema.parse(req.body);

      const result = await authService.register(validatedData);

      return sendSuccess(res, result, 'User registered successfully', 201);
    } catch (error) {
      next(error);
    }
  };

  login = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = loginSchema.parse(req.body);

      const result = await authService.login(validatedData);

      return sendSuccess(res, result, 'Login successful');
    } catch (error) {
      next(error);
    }
  };

  me = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return sendSuccess(res, null, 'No user found');
      }

      const user = await authService.getUserById(userId);

      return sendSuccess(res, user, 'User profile retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  logout = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Since we're using stateless JWT tokens, logout is handled client-side
      // by removing the token from storage
      return sendSuccess(res, null, 'Logout successful');
    } catch (error) {
      next(error);
    }
  };

  refresh = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = refreshTokenSchema.parse(req.body);

      const result = await authService.refreshToken(validatedData.refreshToken);

      return sendSuccess(res, result, 'Token refreshed successfully');
    } catch (error) {
      next(error);
    }
  };
}

export const authController = new AuthController();
export default authController;
