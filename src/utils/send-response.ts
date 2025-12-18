import { Response } from 'express';
import { RESPONSE_CODE } from './http-exception';

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  code?: RESPONSE_CODE;
  timestamp: string;
  requestId: string;
}

export function sendSuccess<T = any>(
  res: Response,
  data: T,
  message: string = 'Success',
  status = 200
): Response<ApiResponse<T>> {
  return res.status(status).json({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
    requestId: res.locals.requestId || 'unknown',
  });
}

export function sendError(
  res: Response,
  message: string,
  status = 400,
  code?: RESPONSE_CODE
): Response<ApiResponse> {
  return res.status(status).json({
    success: false,
    message,
    code,
    timestamp: new Date().toISOString(),
    requestId: res.locals.requestId || 'unknown',
  });
}
