import { Request, Response, NextFunction } from 'express';
import { DashboardService } from './dashboard.service.js';
import { DashboardResponseDTO } from '@lib/shared';

export class DashboardController {
  private dashboardService = new DashboardService();

  /**
   * Retorna os dados agregados do dashboard (sem formatação de UI)
   */
  public getSummary = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          type: '/errors/unauthorized',
          title: 'Usuário não autenticado',
          status: 401,
          detail: 'É necessário estar autenticado para acessar esta rota.',
        });
        return;
      }

      const summary: DashboardResponseDTO =
        await this.dashboardService.getSummary(userId);

      res.status(200).json(summary);
    } catch (error: unknown) {
      next(error);
    }
  };
}
