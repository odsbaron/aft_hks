/**
 * Custom Error Classes
 * Specific error types for better error handling
 */

// Base API Error
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
    Error.captureStackTrace(this, this.constructor);
  }
}

// Bad Request Error (400)
export class BadRequestError extends ApiError {
  constructor(message: string = 'Bad Request', code?: string) {
    super(400, message, code);
    this.name = 'BadRequestError';
  }
}

// Unauthorized Error (401)
export class UnauthorizedError extends ApiError {
  constructor(message: string = 'Unauthorized', code?: string) {
    super(401, message, code);
    this.name = 'UnauthorizedError';
  }
}

// Forbidden Error (403)
export class ForbiddenError extends ApiError {
  constructor(message: string = 'Forbidden', code?: string) {
    super(403, message, code);
    this.name = 'ForbiddenError';
  }
}

// Not Found Error (404)
export class NotFoundError extends ApiError {
  constructor(message: string = 'Not Found', code?: string) {
    super(404, message, code);
    this.name = 'NotFoundError';
  }
}

// Conflict Error (409)
export class ConflictError extends ApiError {
  constructor(message: string = 'Conflict', code?: string) {
    super(409, message, code);
    this.name = 'ConflictError';
  }
}

// Internal Server Error (500)
export class InternalServerError extends ApiError {
  constructor(message: string = 'Internal Server Error', code?: string) {
    super(500, message, code);
    this.name = 'InternalServerError';
  }
}

// Blockchain-specific errors
export class BlockchainError extends Error {
  constructor(
    message: string,
    public originalError?: unknown
  ) {
    super(message);
    this.name = 'BlockchainError';
  }
}

export class ContractCallError extends BlockchainError {
  constructor(message: string, originalError?: unknown) {
    super(message, originalError);
    this.name = 'ContractCallError';
  }
}

export class SignatureValidationError extends BlockchainError {
  constructor(message: string) {
    super(message);
    this.name = 'SignatureValidationError';
  }
}

export class InsufficientSignaturesError extends BlockchainError {
  constructor(
    public required: number,
    public current: number
  ) {
    super(`Insufficient signatures: ${current}/${required} needed`);
    this.name = 'InsufficientSignaturesError';
  }
}
