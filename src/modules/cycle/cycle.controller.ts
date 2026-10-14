import { Request, Response, NextFunction } from 'express';
import { CycleService } from './cycle.service';
import { saveSeasonCyclesSchema } from '@lib/shared';
import { AppError } from '../../utils/AppError';

export class CycleController {
  private service: CycleService;

  constructor() {
    this.service = new CycleService();
  }

  public getByField = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const fieldId = Array.isArray(req.params.fieldId)
        ? req.params.fieldId[0]
        : req.params.fieldId;
      const result = await this.service.getByField(fieldId);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  public saveSeasonCycles = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const fieldId = Array.isArray(req.params.fieldId)
        ? req.params.fieldId[0]
        : req.params.fieldId;
      const userId = (req as any).user?.id;

      const validation = saveSeasonCyclesSchema.safeParse(req.body);
      if (!validation.success) {
        throw new AppError(
          'Erro de validação nos ciclos de safra enviados.',
          400,
          validation.error.flatten().fieldErrors,
        );
      }

      const result = await this.service.saveSeasonCycles(
        fieldId,
        validation.data,
        userId,
      );

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };
}
