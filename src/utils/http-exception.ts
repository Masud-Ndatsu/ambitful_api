export enum RESPONSE_CODE {
  SUCCESS = 'SUCCESS',
  BAD_REQUEST = 'BAD_REQUEST',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
}

export default class HttpException extends Error {
  public code: RESPONSE_CODE;
  public statusCode: number;
  public isOperational: boolean;

  constructor(code: RESPONSE_CODE, message: string, statusCode: number) {
    super(message);
    this.name = 'HttpException';
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = true;

    Object.setPrototypeOf(this, HttpException.prototype);

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, HttpException);
    }

    this.name = this.constructor.name;
  }
}

export class BadRequestException extends HttpException {
  constructor(message: string = 'Bad Request') {
    super(RESPONSE_CODE.BAD_REQUEST, message, 400);
  }
}

export class UnauthorizedException extends HttpException {
  constructor(message: string = 'Unauthorized') {
    super(RESPONSE_CODE.UNAUTHORIZED, message, 401);
  }
}

export class ForbiddenException extends HttpException {
  constructor(message: string = 'Forbidden') {
    super(RESPONSE_CODE.FORBIDDEN, message, 403);
  }
}

export class NotFoundException extends HttpException {
  constructor(message: string = 'Not Found') {
    super(RESPONSE_CODE.NOT_FOUND, message, 404);
  }
}

export class ValidationException extends HttpException {
  constructor(message: string = 'Validation Error') {
    super(RESPONSE_CODE.VALIDATION_ERROR, message, 422);
  }
}

export class ConflictException extends HttpException {
  constructor(message: string = 'Conflict') {
    super(RESPONSE_CODE.BAD_REQUEST, message, 409);
  }
}

export class InternalServerErrorException extends HttpException {
  constructor(message: string = 'Internal Server Error') {
    super(RESPONSE_CODE.INTERNAL_SERVER_ERROR, message, 500);
  }
}
