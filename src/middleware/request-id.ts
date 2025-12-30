import { Request, Response, NextFunction } from 'express';
import { randomBytes } from 'crypto';

export const requestId = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const id = `req_${randomBytes(8).toString('hex')}`;

  req.requestId = id;
  res.locals.requestId = id;

  res.setHeader('X-Request-ID', id);

  next();
};
