import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError.js';

export const errorMiddleware = (
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
) => {
  if (process.env.NODE_ENV == 'development') {
    console.error('❌ Error captured:', error);
  }

  // Known applications bugs
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      success: false,
      message: error.message,
      errors: error.details || undefined,
    });
  }

  // Unexpected error
  return res.status(500).json({
    success: false,
    message: 'Internal server error.',
  });
};
