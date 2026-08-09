import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError.js';
import { z, ZodError, treeifyError } from 'zod';

export const validate =
  (schema: z.Schema) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync({
        body: req.body,
        params: req.params,
        query: req.query,
      });

      return next();
    } catch (error) {
      if (error instanceof ZodError) {
        const flattenedErrors = treeifyError(error);

        const validationError = new AppError(
          'Erro de validação de dados.',
          400,
          flattenedErrors,
        );

        return next(validationError);
      }

      next(error);
    }
  };
