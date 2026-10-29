import { Request, Response, NextFunction } from 'express';
import { AdminService } from './admin.service.js';
import { adminUserFilterSchema, updateUserRoleSchema } from '@lib/shared';
import { AppError } from '../../utils/AppError.js';

export class AdminController {
  private service: AdminService;

  constructor() {
    this.service = new AdminService();
  }

  public getMetrics = async (
    _req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const metrics = await this.service.getMetrics();
      res.status(200).json(metrics);
    } catch (error) {
      next(error);
    }
  };

  public listUsers = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const validation = adminUserFilterSchema.safeParse(req.query);
      if (!validation.success) {
        throw new AppError(
          'Parâmetros de filtro inválidos.',
          400,
          validation.error.flatten().fieldErrors,
        );
      }

      const result = await this.service.listUsers(validation.data);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  public updateUserRole = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const validation = updateUserRoleSchema.safeParse(req.body);

      if (!validation.success) {
        throw new AppError(
          'Papel de usuário inválido.',
          400,
          validation.error.flatten().fieldErrors,
        );
      }

      const updated = await this.service.updateUserRole(
        id,
        validation.data.role,
      );
      res.status(200).json(updated);
    } catch (error) {
      next(error);
    }
  };

  public toggleUserStatus = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const { isActive } = req.body;

      if (typeof isActive !== 'boolean') {
        throw new AppError('O campo isActive deve ser um booleano.', 400);
      }

      const updated = await this.service.toggleUserStatus(id, isActive);
      res.status(200).json(updated);
    } catch (error) {
      next(error);
    }
  };
}
