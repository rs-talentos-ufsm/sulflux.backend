import { Router } from 'express';
import {
  registry,
  rfc7807ErrorSchema,
  dashboardResponseSchema,
} from '@lib/shared';
import { DashboardController } from './dashboard.controller.js';
import { ensureAuthenticated } from '../../middleware/ensureAuthenticated.js';

const router = Router();
const dashboardController = new DashboardController();

// --- Registro da Rota no OpenAPI Registry ---
registry.registerPath({
  method: 'get',
  path: '/dashboard',
  summary: 'Busca as métricas reais e dados agregados do dashboard do banco',
  security: [{ cookieAuth: [] }],
  tags: ['Dashboard'],
  responses: {
    200: {
      description: 'Dados do dashboard retornados com sucesso',
      content: { 'application/json': { schema: dashboardResponseSchema } },
    },
    401: {
      description: 'Não autorizado',
    },
    500: {
      description: 'Erro interno',
      content: { 'application/json': { schema: rfc7807ErrorSchema } },
    },
  },
});

// --- Execução Física das Rotas do Express ---
router.use(ensureAuthenticated);

router.get('/', dashboardController.getSummary);

export default router;
