import { Router } from 'express';
import {
  registry,
  z,
  createTimeLogSchema,
  updateTimeLogSchema,
  timeLogResponseSchema,
  rfc7807ErrorSchema,
} from '@lib/shared';
import { TimeLogController } from './time-log.controller.js';
import { ensureAuthenticated } from '../../middleware/ensureAuthenticated.js';

const router = Router();
const timeLogController = new TimeLogController();

// --- Registro das Rotas no OpenAPI Registry ---

// POST /time-logs
registry.registerPath({
  method: 'post',
  path: '/time-logs',
  summary: 'Registra horas oficialmente e encerra sessões ativas',
  security: [{ cookieAuth: [] }],
  tags: ['Time Log'],
  request: {
    body: {
      content: {
        'application/json': { schema: createTimeLogSchema },
      },
    },
  },
  responses: {
    201: {
      description: 'Registro de horas criado com sucesso',
      content: { 'application/json': { schema: timeLogResponseSchema } },
    },
    400: {
      description: 'Dados inválidos ou erro de validação do formulário',
      content: { 'application/json': { schema: rfc7807ErrorSchema } },
    },
    401: { description: 'Não autorizado' },
  },
});

// GET /time-logs/active
registry.registerPath({
  method: 'get',
  path: '/time-logs/active',
  summary: 'Busca a tarefa que está com o cronômetro ativo no momento',
  security: [{ cookieAuth: [] }],
  tags: ['Time Log'],
  responses: {
    200: {
      description: 'Retorna os dados do cronômetro ativo',
    },
    204: { description: 'Nenhum cronômetro ativo no momento' },
    401: { description: 'Não autorizado' },
  },
});

// GET /time-logs
registry.registerPath({
  method: 'get',
  path: '/time-logs',
  summary: 'Lista todos os registros de horas do usuário',
  security: [{ cookieAuth: [] }],
  tags: ['Time Log'],
  request: {
    query: z.object({
      page: z.string().optional(),
      limit: z.string().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }),
  },
  responses: {
    200: { description: 'Lista paginada de registros de horas' },
    401: { description: 'Não autorizado' },
  },
});

// GET /time-logs/{id}
registry.registerPath({
  method: 'get',
  path: '/time-logs/{id}',
  summary: 'Busca um registro de horas específico pelo ID',
  security: [{ cookieAuth: [] }],
  tags: ['Time Log'],
  request: {
    params: z.object({ id: z.string().uuid() }),
  },
  responses: {
    200: {
      description: 'Detalhes do registro de horas',
      content: { 'application/json': { schema: timeLogResponseSchema } },
    },
    404: { description: 'Registro não encontrado' },
    401: { description: 'Não autorizado' },
  },
});

// PATCH /time-logs/{id}
registry.registerPath({
  method: 'patch',
  path: '/time-logs/{id}',
  summary: 'Atualiza um registro de horas existente',
  security: [{ cookieAuth: [] }],
  tags: ['Time Log'],
  request: {
    params: z.object({ id: z.string().uuid() }),
    body: {
      content: {
        'application/json': { schema: updateTimeLogSchema },
      },
    },
  },
  responses: {
    200: {
      description: 'Registro atualizado com sucesso',
      content: { 'application/json': { schema: timeLogResponseSchema } },
    },
    400: {
      description: 'Dados de atualização inválidos',
      content: { 'application/json': { schema: rfc7807ErrorSchema } },
    },
    404: { description: 'Registro não encontrado' },
    401: { description: 'Não autorizado' },
  },
});

// DELETE /time-logs/{id}
registry.registerPath({
  method: 'delete',
  path: '/time-logs/{id}',
  summary: 'Deleta um registro de horas e ajusta o tempo total da tarefa',
  security: [{ cookieAuth: [] }],
  tags: ['Time Log'],
  request: {
    params: z.object({ id: z.string().uuid() }),
  },
  responses: {
    204: { description: 'Registro excluído com sucesso' },
    404: { description: 'Registro não encontrado' },
    401: { description: 'Não autorizado' },
  },
});

// --- Execução Física das Rotas do Express ---
router.use(ensureAuthenticated);

// Protegendo o contexto do this chamando através de arrow functions
router.post('/', timeLogController.createLog);
router.get('/', timeLogController.findAll);
router.get('/active', timeLogController.getActiveTimer);
router.get('/:id', timeLogController.findById);
router.patch('/:id', timeLogController.update);
router.delete('/:id', timeLogController.delete);

export default router;
