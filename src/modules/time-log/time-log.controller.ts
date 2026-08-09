import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { TimeLogService } from './time-log.service.js';
import {
  createTimeLogSchema,
  updateTimeLogSchema,
  taskIdSchema,
  CreateTimeLogDTO,
  UpdateTimeLogDTO,
  TimeLogResponseDTO,
} from '@lib/shared';

// Schemas locais para validação rápida de Params e Query
const idParamSchema = z.object({
  id: z.string().uuid('Formato de ID inválido'),
});

const querySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

export class TimeLogController {
  private timeLogService = new TimeLogService();

  /**
   * Alterna o estado do cronômetro (Play/Pause) para uma tarefa
   */
  public toggleTimer = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const validation = taskIdSchema.safeParse(req.params);

      if (!validation.success) {
        res.status(400).json({
          type: '/errors/validation-error',
          title: 'ID inválido',
          status: 400,
          detail: 'O ID da tarefa fornecido não é válido.',
          errors: validation.error.flatten().fieldErrors,
        });
        return;
      }

      const { id: taskId } = validation.data;
      const userId = (req as any).user.id;

      const result = await this.timeLogService.toggleTimer(taskId, userId);

      res.status(200).json(result);
    } catch (error: unknown) {
      next(error);
    }
  };

  /**
   * Busca o tempo acumulado (não consolidado) de uma tarefa
   */
  public getPending = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const validation = taskIdSchema.safeParse(req.params);

      if (!validation.success) {
        res.status(400).json({
          type: '/errors/validation-error',
          title: 'ID inválido',
          status: 400,
          detail: 'O ID da tarefa fornecido não é válido.',
          errors: validation.error.flatten().fieldErrors,
        });
        return;
      }

      const { id: taskId } = validation.data;
      const userId = (req as any).user.id;

      const result = await this.timeLogService.getPendingTime(taskId, userId);

      res.status(200).json(result);
    } catch (error: unknown) {
      next(error);
    }
  };

  /**
   * Salva o formulário oficial (Cria o TimeLog e arquiva as TimeSessions)
   */
  public createLog = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const validation = createTimeLogSchema.safeParse(req.body);

      if (!validation.success) {
        res.status(400).json({
          type: '/errors/validation-error',
          title: 'Erro de validação nos dados enviados',
          status: 400,
          detail: 'Um ou mais campos falharam na validação.',
          errors: validation.error.flatten().fieldErrors,
        });
        return;
      }

      const logData: CreateTimeLogDTO = validation.data;
      const userId = (req as any).user.id;

      const newLog: TimeLogResponseDTO = await this.timeLogService.createLog(
        userId,
        logData,
      );

      res.status(201).json(newLog);
    } catch (error: unknown) {
      next(error);
    }
  };

  /**
   * Busca a tarefa que está com o cronômetro ativo no momento
   */
  public getActiveTimer = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const userId = (req as any).user.id;
      const activeTimer = await this.timeLogService.getActiveTimer(userId);

      if (!activeTimer) {
        res.status(204).send(); // Retorna 204 No Content se não houver timer ativo
        return;
      }

      res.status(200).json(activeTimer);
    } catch (error: unknown) {
      next(error);
    }
  };

  /**
   * Lista logs de tempo com paginação e filtros
   */
  public findAll = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const validation = querySchema.safeParse(req.query);

      if (!validation.success) {
        res.status(400).json({
          type: '/errors/validation-error',
          title: 'Parâmetros de busca inválidos',
          status: 400,
          errors: validation.error.flatten().fieldErrors,
        });
        return;
      }

      const { page, limit, startDate, endDate } = validation.data;
      const userId = (req as any).user.id;

      const result = await this.timeLogService.findAll(
        page,
        limit,
        userId,
        startDate,
        endDate,
      );

      res.status(200).json(result);
    } catch (error: unknown) {
      next(error);
    }
  };

  /**
   * Busca um registro de tempo específico pelo ID
   */
  public findById = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const validation = idParamSchema.safeParse(req.params);

      if (!validation.success) {
        res.status(400).json({
          type: '/errors/validation-error',
          title: 'ID inválido',
          status: 400,
          errors: validation.error.flatten().fieldErrors,
        });
        return;
      }

      const { id } = validation.data;
      const userId = (req as any).user.id;

      const log = await this.timeLogService.findById(id, userId);

      res.status(200).json(log);
    } catch (error: unknown) {
      next(error);
    }
  };

  /**
   * Atualiza um registro de tempo
   */
  public update = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const idValidation = idParamSchema.safeParse(req.params);
      const bodyValidation = updateTimeLogSchema.safeParse(req.body);

      if (!idValidation.success || !bodyValidation.success) {
        res.status(400).json({
          type: '/errors/validation-error',
          title: 'Dados inválidos',
          status: 400,
          errors: {
            ...idValidation.error?.flatten().fieldErrors,
            ...bodyValidation.error?.flatten().fieldErrors,
          },
        });
        return;
      }

      const { id } = idValidation.data;
      const logData: UpdateTimeLogDTO = bodyValidation.data;
      const userId = (req as any).user.id;

      const updatedLog = await this.timeLogService.update(id, userId, logData);

      res.status(200).json(updatedLog);
    } catch (error: unknown) {
      next(error);
    }
  };

  /**
   * Remove um registro de tempo
   */
  public delete = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const validation = idParamSchema.safeParse(req.params);

      if (!validation.success) {
        res.status(400).json({
          type: '/errors/validation-error',
          title: 'ID inválido',
          status: 400,
          errors: validation.error.flatten().fieldErrors,
        });
        return;
      }

      const { id } = validation.data;
      const userId = (req as any).user.id;

      await this.timeLogService.delete(id, userId);

      res.status(204).send();
    } catch (error: unknown) {
      next(error);
    }
  };
}
