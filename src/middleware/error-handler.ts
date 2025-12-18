import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import logger from "../config/logger";
import { Prisma } from "../generated/prisma/client";
import HttpException, { RESPONSE_CODE } from "../utils/http-exception";
import { sendError } from "../utils/send-response";

export const errorHandler = (
  err: HttpException | Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Log error details
  logger.error("Error occurred:", {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
    requestId: res.locals.requestId,
  });

  // Handle HttpException instances
  if (err instanceof HttpException) {
    return sendError(res, err.message, err.statusCode, err.code) as any;
  }

  // Handle Prisma validation error
  if (err instanceof Prisma.PrismaClientValidationError) {
    return sendError(
      res,
      "Invalid data provided",
      400,
      RESPONSE_CODE.VALIDATION_ERROR
    ) as any;
  }

  // Handle Prisma known request error
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    let message = "Database operation failed";
    let statusCode = 400;
    let code = RESPONSE_CODE.BAD_REQUEST;

    switch (err.code) {
      case "P2002":
        message = "Unique constraint violation";
        statusCode = 409;
        code = RESPONSE_CODE.BAD_REQUEST;
        break;
      case "P2025":
        message = "Record not found";
        statusCode = 404;
        code = RESPONSE_CODE.NOT_FOUND;
        break;
      case "P2003":
        message = "Foreign key constraint violation";
        statusCode = 400;
        code = RESPONSE_CODE.BAD_REQUEST;
        break;
    }

    return sendError(res, message, statusCode, code) as any;
  }

  // Handle Zod validation error
  if (err instanceof ZodError) {
    const message = `Validation failed: ${err.issues
      .map((e) => `${e.path.join(".")}: ${e.message}`)
      .join(", ")}`;
    return sendError(res, message, 400, RESPONSE_CODE.VALIDATION_ERROR) as any;
  }

  // Handle JWT errors
  if (err.name === "JsonWebTokenError") {
    return sendError(
      res,
      "Invalid token",
      401,
      RESPONSE_CODE.UNAUTHORIZED
    ) as any;
  }

  if (err.name === "TokenExpiredError") {
    return sendError(
      res,
      "Token expired",
      401,
      RESPONSE_CODE.UNAUTHORIZED
    ) as any;
  }

  // Handle Mongoose bad ObjectId (if using MongoDB)
  if (err.name === "CastError") {
    return sendError(
      res,
      "Resource not found",
      404,
      RESPONSE_CODE.NOT_FOUND
    ) as any;
  }

  // Default server error
  const isDevelopment = process.env.NODE_ENV === "development";
  const message = isDevelopment ? err.message : "Internal server error";

  return sendError(
    res,
    message,
    500,
    RESPONSE_CODE.INTERNAL_SERVER_ERROR
  ) as any;
};
