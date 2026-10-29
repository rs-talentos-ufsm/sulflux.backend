import { Router } from 'express';
import {
  registry,
  z,
  adminMetricsResponseSchema,
  userResponseSchema,
  updateUserRoleSchema,
  rfc7807ErrorSchema,
  UserRole,
} from '@lib/shared';
import { AdminController } from './admin.controller.js';
import { ensureAuthenticated } from '../../middleware/ensureAuthenticated.js';
import { ensureRole } from '../../middleware/ensureRole.js';

const router = Router();
const controller = new AdminController();

// OpenAPI docs
registry.registerPath({
  method: 'get',
  path: '/admin/metrics',
  summary: 'Retorna métricas consolidadas da plataforma para administradores',
  tags: ['Admin'],
  security: [{ cookieAuth: [] }],
  responses: {
    200: {
      description: 'Métricas consolidadas retornadas com sucesso',
      content: {
        'application/json': { schema: adminMetricsResponseSchema },
      },
    },
    403: {
      description: 'Acesso negado — requer privilégios de administrador',
      content: { 'application/json': { schema: rfc7807ErrorSchema } },
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/admin/users',
  summary: 'Lista todos os usuários com filtros para gestão administrativa',
  tags: ['Admin'],
  security: [{ cookieAuth: [] }],
  request: {
    query: z.object({
      page: z.string().optional(),
      limit: z.string().optional(),
      search: z.string().optional(),
      role: z.nativeEnum(UserRole).optional(),
      isActive: z.string().optional(),
    }),
  },
  responses: {
    200: {
      description: 'Lista paginada de usuários',
      content: {
        'application/json': {
          schema: z.object({
            data: z.array(userResponseSchema),
            meta: z.object({
              page: z.number(),
              limit: z.number(),
              total: z.number(),
              totalPages: z.number(),
            }),
          }),
        },
      },
    },
  },
});

registry.registerPath({
  method: 'patch',
  path: '/admin/users/{id}/role',
  summary: 'Altera o papel/perfil de acesso de um usuário',
  tags: ['Admin'],
  security: [{ cookieAuth: [] }],
  request: {
    params: z.object({ id: z.string().uuid() }),
    body: {
      content: {
        'application/json': { schema: updateUserRoleSchema },
      },
    },
  },
  responses: {
    200: {
      description: 'Papel do usuário atualizado com sucesso',
      content: { 'application/json': { schema: userResponseSchema } },
    },
    400: {
      description: 'Dados inválidos',
      content: { 'application/json': { schema: rfc7807ErrorSchema } },
    },
  },
});

registry.registerPath({
  method: 'patch',
  path: '/admin/users/{id}/status',
  summary: 'Ativa ou desativa um usuário',
  tags: ['Admin'],
  security: [{ cookieAuth: [] }],
  request: {
    params: z.object({ id: z.string().uuid() }),
    body: {
      content: {
        'application/json': {
          schema: z.object({ isActive: z.boolean() }),
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Status do usuário atualizado com sucesso',
      content: { 'application/json': { schema: userResponseSchema } },
    },
  },
});

// Middleware encadeado: Autenticado + Role de ADMIN
const requireAdmin = [ensureAuthenticated, ensureRole([UserRole.ADMIN])];

router.get('/metrics', requireAdmin, controller.getMetrics);
router.get('/users', requireAdmin, controller.listUsers);
router.patch('/users/:id/role', requireAdmin, controller.updateUserRole);
router.patch('/users/:id/status', requireAdmin, controller.toggleUserStatus);

export default router;
