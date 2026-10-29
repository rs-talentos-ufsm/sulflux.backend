import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError.js';
import { prisma } from '../infra/database.js';
import { UserRole } from '@lib/shared';

export const ensureRole = (allowedRoles: (UserRole | string)[]) => {
  return async (
    req: Request,
    _res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (!req.user || !req.user.id) {
        throw new AppError('Usuário não autenticado.', 401);
      }

      // Se a role ainda não estiver em cache na requisição, busca no banco
      let userRole = req.user.role;
      if (!userRole) {
        const user = await prisma.user.findUnique({
          where: { id: req.user.id },
          select: { role: true, isActive: true },
        });

        if (!user || !user.isActive) {
          throw new AppError('Usuário inativo ou não encontrado.', 403);
        }

        userRole = user.role;
        req.user.role = userRole;
      }

      if (!allowedRoles.includes(userRole)) {
        throw new AppError(
          'Acesso não autorizado para o perfil do usuário.',
          403,
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
