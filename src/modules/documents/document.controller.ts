import { Request, Response, NextFunction } from 'express';
import { DocumentService } from './document.service';
import { createDocumentSchema } from '@lib/shared';
import { AppError } from '../../utils/AppError';

export class DocumentController {
  private service: DocumentService;

  constructor() {
    this.service = new DocumentService();
  }

  public list = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const userId = (req as any).user?.id;
      const { search, folder } = req.query;

      const result = await this.service.list(
        userId,
        typeof search === 'string' ? search : undefined,
        typeof folder === 'string' ? folder : undefined,
      );

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  public getFolders = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const userId = (req as any).user?.id;
      const result = await this.service.getFolders(userId);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  public create = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const userId = (req as any).user?.id;
      const validation = createDocumentSchema.safeParse(req.body);

      if (!validation.success) {
        throw new AppError(
          'Erro na validação do documento.',
          400,
          validation.error.flatten().fieldErrors,
        );
      }

      const result = await this.service.create(validation.data, userId);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  };

  public delete = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const userId = (req as any).user?.id;
      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;

      await this.service.delete(id, userId);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };
}
