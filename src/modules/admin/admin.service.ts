import { prisma } from '../../infra/database.js';
import { AppError } from '../../utils/AppError.js';
import {
  AdminMetricsResponseDTO,
  AdminUserFilterDTO,
  PaginatedUsersDTO,
  UserRole,
} from '@lib/shared';

export class AdminService {
  /**
   * Retorna métricas globais da plataforma para o painel de administração
   */
  public async getMetrics(): Promise<AdminMetricsResponseDTO> {
    const [
      totalUsers,
      usersGrouped,
      totalProperties,
      propertiesGrouped,
      totalFields,
      fieldsArea,
      totalCropCycles,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.groupBy({
        by: ['role'],
        _count: { id: true },
      }),
      prisma.property.count(),
      prisma.property.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
      prisma.field.count(),
      prisma.field.aggregate({
        _sum: { area: true },
      }),
      prisma.cropCycle.count(),
    ]);

    const usersByRole: Record<UserRole, number> = {
      [UserRole.ADMIN]: 0,
      [UserRole.PRODUCER]: 0,
      [UserRole.INTERMEDIARY]: 0,
      [UserRole.VIEWER]: 0,
    };

    usersGrouped.forEach((group) => {
      const role = group.role as UserRole;
      if (usersByRole[role] !== undefined) {
        usersByRole[role] = group._count.id;
      }
    });

    const propertiesByStatus: Record<string, number> = {};
    propertiesGrouped.forEach((group) => {
      propertiesByStatus[group.status] = group._count.id;
    });

    return {
      totalUsers,
      totalProperties,
      totalFields,
      totalMonitoredAreaHa: Number(fieldsArea._sum.area || 0),
      totalCropCycles,
      usersByRole,
      propertiesByStatus,
    };
  }

  /**
   * Lista usuários com paginação e filtros para o painel de administração
   */
  public async listUsers(
    filters: AdminUserFilterDTO,
  ): Promise<PaginatedUsersDTO> {
    const page = Number(filters.page) || 1;
    const limit = Number(filters.limit) || 10;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    if (filters.role) {
      where.role = filters.role;
    }

    if (typeof filters.isActive === 'boolean') {
      where.isActive = filters.isActive;
    }

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
    ]);

    return {
      data: users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role as UserRole,
        isActive: u.isActive,
        created_at: u.createdAt,
        updated_at: u.updatedAt,
      })),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Atualiza o papel/perfil de um usuário
   */
  public async updateUserRole(userId: string, role: UserRole) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError('Usuário não encontrado.', 404);
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { role },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      role: updated.role as UserRole,
      isActive: updated.isActive,
      created_at: updated.createdAt,
      updated_at: updated.updatedAt,
    };
  }

  /**
   * Ativa ou desativa um usuário no sistema
   */
  public async toggleUserStatus(userId: string, isActive: boolean) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError('Usuário não encontrado.', 404);
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { isActive },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      role: updated.role as UserRole,
      isActive: updated.isActive,
      created_at: updated.createdAt,
      updated_at: updated.updatedAt,
    };
  }
}
