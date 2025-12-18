import { Request, Response, NextFunction } from "express";
import { sendError } from "./send-response";
import { ZodError } from "zod";
import HttpException, { RESPONSE_CODE } from "./http-exception";
import logger from "../config/logger";

export default function catchError(fn: Function) {
  return async function (req: Request, res: Response, next: NextFunction) {
    try {
      return await fn(req, res, next);
    } catch (err: any) {
      logger.error("API Error:", {
        error: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
        requestId: res.locals.requestId,
      });

      if (err instanceof HttpException) {
        return sendError(res, err.message, err.statusCode, err.code);
      }

      if (err instanceof ZodError) {
        const validationMessage = err.issues
          .map((e) => `${e.path.join(".")}: ${e.message}`)
          .join(", ");
        return sendError(
          res,
          `${validationMessage}`,
          400,
          RESPONSE_CODE.VALIDATION_ERROR
        );
      }

      return sendError(
        res,
        "Internal server error",
        500,
        RESPONSE_CODE.INTERNAL_SERVER_ERROR
      );
    }
  };
}
