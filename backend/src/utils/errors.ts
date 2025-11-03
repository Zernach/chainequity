/**
 * Custom error classes for ChainEquity backend
 */

import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
    public readonly statusCode: number;
    public readonly code: string;

    constructor(message: string, statusCode: number = 500, code: string = 'INTERNAL_ERROR') {
        super(message);
        this.name = this.constructor.name;
        this.statusCode = statusCode;
        this.code = code;
        Error.captureStackTrace(this, this.constructor);
    }
}

export class ValidationError extends AppError {
    public readonly details: any;

    constructor(message: string, details: any = null) {
        super(message, 400, 'VALIDATION_ERROR');
        this.details = details;
    }
}

export class NotFoundError extends AppError {
    constructor(resource: string = 'Resource') {
        super(`${resource} not found`, 404, 'NOT_FOUND');
    }
}

export class UnauthorizedError extends AppError {
    constructor(message: string = 'Unauthorized') {
        super(message, 401, 'UNAUTHORIZED');
    }
}

export class ForbiddenError extends AppError {
    constructor(message: string = 'Forbidden') {
        super(message, 403, 'FORBIDDEN');
    }
}

export class BlockchainError extends AppError {
    public readonly txSignature: string | null;

    constructor(message: string, txSignature: string | null = null) {
        super(message, 500, 'BLOCKCHAIN_ERROR');
        this.txSignature = txSignature;
    }
}

export class DatabaseError extends AppError {
    public readonly originalError: Error | null;

    constructor(message: string, originalError: Error | null = null) {
        super(message, 500, 'DATABASE_ERROR');
        this.originalError = originalError;
    }
}

/**
 * Error handler middleware
 */
export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
    let error: AppError;

    // Convert non-AppError errors to AppError
    if (!(err instanceof AppError)) {
        error = new AppError(
            err.message || 'Internal server error',
            500,
            'INTERNAL_ERROR'
        );
    } else {
        error = err;
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

    // Prepare error response
    const errorResponse: Record<string, any> = {
        success: false,
        error: error.message,
        code: error.code,
    };

    // Add optional fields if they exist
    if (error instanceof ValidationError && error.details) {
        errorResponse.details = error.details;
    }

    if (error instanceof BlockchainError && error.txSignature) {
        errorResponse.txSignature = error.txSignature;
    }

    // Send error response
    res.status(error.statusCode).json(errorResponse);
}

