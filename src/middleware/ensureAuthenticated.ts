import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError.js';
import { verifyToken } from '../utils/jwt.js';

export const ensureAuthenticated = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const token = req.cookies.accessToken;

    if (!token) {
      throw new AppError('Token não fornecido ou inválido.', 401);
    }

    const userId = verifyToken(token);

    if (!userId) {
      throw new AppError('Token inválido ou expirado.', 401);
    }

    req.user = {
      id: userId,
    };

    return next();
  } catch (error) {
    next(error);
  }
};
