import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth-service';
import { sendError } from '../utils/send-response';
import { prisma } from '../config/database';
import logger from '../config/logger';

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendError(res, 'Access token is required', 401) as any;
    }

    const token = authHeader.substring(7);

    const userId = await authService.verifyToken(token);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        isEmailVerified: true,
      },
    });

    if (!user) {
      return sendError(res, 'User no longer exists', 401) as any;
    }

    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      isEmailVerified: user.isEmailVerified,
    };

    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    throw error;
  }
};

export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7);

    try {
      const userId = await authService.verifyToken(token);

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          isEmailVerified: true,
        },
      });

      if (user) {
        req.user = {
          id: user.id,
          email: user.email,
          name: user.name,
          isEmailVerified: user.isEmailVerified,
        };
      }
    } catch (error) {
      logger.warn('Optional auth failed:', error);
    }

    next();
  } catch (error) {
    logger.error('Optional authentication error:', error);
    next();
  }
};
