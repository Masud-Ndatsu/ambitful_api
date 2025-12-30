import { Request, Response, NextFunction } from 'express';
import { ForbiddenException } from '../utils/http-exception';

export const requireRole = (allowedRoles: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      console.log({ user: req.user });
      if (!req.user?.id) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      // Get user role from the request (set by auth middleware)
      const userRole = req.user.role;

      if (!userRole || !allowedRoles.includes(userRole)) {
        throw new ForbiddenException('Insufficient permissions');
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

// Convenience functions for common role checks
export const requireAdmin = requireRole(['ADMIN']);
export const requireModeratorOrAdmin = requireRole(['MODERATOR', 'ADMIN']);
export const requireUser = requireRole(['USER', 'MODERATOR', 'ADMIN']);
