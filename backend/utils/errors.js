/**
 * Custom error classes for ChainEquity backend
 */

class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, details = null) {
    super(message, 400, 'VALIDATION_ERROR');
    this.details = details;
  }
}

class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 403, 'FORBIDDEN');
  }
}

class BlockchainError extends AppError {
  constructor(message, txSignature = null) {
    super(message, 500, 'BLOCKCHAIN_ERROR');
    this.txSignature = txSignature;
  }
}

class DatabaseError extends AppError {
  constructor(message, originalError = null) {
    super(message, 500, 'DATABASE_ERROR');
    this.originalError = originalError;
  }
}

/**
 * Error handler middleware
 */
function errorHandler(err, req, res, next) {
  let error = err;

  // Convert non-AppError errors to AppError
  if (!(err instanceof AppError)) {
    error = new AppError(
      err.message || 'Internal server error',
      err.statusCode || 500,
      err.code || 'INTERNAL_ERROR'
    );
  }

  // Log error
  console.error('[Error]', {
    message: error.message,
    code: error.code,
    statusCode: error.statusCode,
    stack: error.stack,
    path: req.path,
    method: req.method,
  });

  // Send error response
  res.status(error.statusCode).json({
    success: false,
    error: error.message,
    code: error.code,
    ...(error.details && { details: error.details }),
    ...(error.txSignature && { txSignature: error.txSignature }),
  });
}

module.exports = {
  AppError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  BlockchainError,
  DatabaseError,
  errorHandler,
};

