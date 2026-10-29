import { Request, Response, NextFunction } from 'express';
import { GisService } from './gis.service.js';
import { confirmShapefileImportSchema } from '@lib/shared';
import { AppError } from '../../utils/AppError.js';

export class GisController {
  private service: GisService;

  constructor() {
    this.service = new GisService();
  }

  public importShapefile = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { fileBase64 } = req.body;

      if (!fileBase64 || typeof fileBase64 !== 'string') {
        throw new AppError(
          'Arquivo Shapefile em Base64 não fornecido no corpo da requisição.',
          400,
        );
      }

      // Remove prefixo data:...;base64, se houver
      const cleanBase64 = fileBase64.includes(',')
        ? fileBase64.split(',')[1]
        : fileBase64;

      const buffer = Buffer.from(cleanBase64, 'base64');
      const result = await this.service.parseShapefile(buffer);

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  public confirmImport = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const userId = (req as any).user?.id;
      const validation = confirmShapefileImportSchema.safeParse(req.body);

      if (!validation.success) {
        throw new AppError(
          'Dados de importação inválidos.',
          400,
          validation.error.flatten().fieldErrors,
        );
      }

      const result = await this.service.confirmImport(validation.data, userId);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  };
}
