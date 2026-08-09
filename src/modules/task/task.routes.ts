import { Router } from 'express';
import {
  registry,
  z,
  createTaskSchema,
  updateTaskSchema,
  taskIdSchema,
  taskResponseSchema,
  rfc7807ErrorSchema,
  createPaginatedResponseSchema,
  pendingTimeResponseSchema,
  toggleTimerResponseSchema,
} from '@lib/shared';
import { TaskController } from './task.controller.js';
import { TimeLogController } from '../time-log/time-log.controller.js';
import { ensureAuthenticated } from '../../middleware/ensureAuthenticated.js';

const router = Router();
const taskController = new TaskController();
const timeTrackingController = new TimeLogController();

// --- Registro das Rotas no OpenAPI Registry ---

// Rota: Criar Tarefa
registry.registerPath({
  method: 'post',
  path: '/tasks',
  summary: 'Cria uma nova tarefa',
  tags: ['Task'],
  request: {
    body: {
      content: {
        'application/json': {
          schema: createTaskSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Tarefa criada com sucesso',
      content: { 'application/json': { schema: taskResponseSchema } },
    },
    400: {
      description: 'Dados inválidos ou erro de validação',
      content: { 'application/json': { schema: rfc7807ErrorSchema } },
    },
  },
});

// Rota: Listar Tarefas Paginadas
const taskPaginatedResponseSchema = createPaginatedResponseSchema(
  taskResponseSchema,
  'TaskPaginatedResponse',
);

registry.registerPath({
  method: 'get',
  path: '/tasks',
  summary: 'Lista tarefas com paginação',
  security: [{ cookieAuth: [] }],
  tags: ['Task'],
  request: {
    query: z.object({
      page: z.coerce.number().optional().default(1),
      limit: z.coerce.number().optional().default(10),
      // projectId: z.string().uuid().optional().openapi({
      //   description: 'Filtra tarefas por ID do projeto',
      //   example: '123e4567-e89b-12d3-a456-426614174000',
      // }),
    }),
  },
  responses: {
    200: {
      description: 'Lista de tarefas retornada com sucesso',
      content: { 'application/json': { schema: taskPaginatedResponseSchema } }, // { data: [...], meta: {...} }
    },
    401: { description: 'Não autorizado' },
  },
});

// Rota: Buscar por ID
registry.registerPath({
  method: 'get',
  path: '/tasks/{id}',
  summary: 'Busca uma tarefa pelo ID',
  security: [{ cookieAuth: [] }],
  tags: ['Task'],
  request: { params: taskIdSchema },
  responses: {
    200: {
      description: 'Tarefa encontrada',
      content: { 'application/json': { schema: taskResponseSchema } },
    },
    401: { description: 'Não autorizado' },
    404: {
      description: 'Tarefa não encontrada',
      content: { 'application/json': { schema: rfc7807ErrorSchema } },
    },
  },
});

// Rota: Atualizar Tarefa
registry.registerPath({
  method: 'patch',
  path: '/tasks/{id}',
  summary: 'Atualiza dados de uma tarefa existente',
  security: [{ cookieAuth: [] }],
  tags: ['Task'],
  request: {
    params: taskIdSchema,
    body: {
      content: {
        'application/json': {
          schema: updateTaskSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Tarefa atualizada com sucesso',
      content: { 'application/json': { schema: taskResponseSchema } },
    },
    400: {
      description: 'Dados fornecidos inválidos',
      content: { 'application/json': { schema: rfc7807ErrorSchema } },
    },
    401: { description: 'Não autorizado' },
    404: {
      description: 'Tarefa não encontrada',
      content: { 'application/json': { schema: rfc7807ErrorSchema } },
    },
  },
});

// Rota: Soft Delete de Tarefa
registry.registerPath({
  method: 'delete',
  path: '/tasks/{id}',
  summary: 'Remove logicamente uma tarefa',
  security: [{ cookieAuth: [] }],
  tags: ['Task'],
  request: { params: taskIdSchema },
  responses: {
    200: {
      description: 'Tarefa removida com sucesso (sem retorno de conteúdo)',
    },
    401: { description: 'Não autorizado' },
    404: {
      description: 'Tarefa não encontrada',
      content: { 'application/json': { schema: rfc7807ErrorSchema } },
    },
  },
});

// Rota: Toggle Timer (Play / Pause)
registry.registerPath({
  method: 'post',
  path: '/tasks/{id}/timer/toggle',
  summary: 'Alterna o estado do cronômetro (Play/Pause) de uma tarefa',
  security: [{ cookieAuth: [] }],
  tags: ['Time Log'],
  request: {
    params: taskIdSchema,
  },
  responses: {
    200: {
      description: 'Estado do cronômetro atualizado com sucesso',
      content: { 'application/json': { schema: toggleTimerResponseSchema } },
    },
    400: {
      description: 'ID da tarefa inválido',
      content: { 'application/json': { schema: rfc7807ErrorSchema } },
    },
    401: { description: 'Não autorizado' },
  },
});

// Rota: Buscar Tempo Pendente (Preparação para o Stop)
registry.registerPath({
  method: 'get',
  path: '/tasks/{id}/timer/pending',
  summary: 'Busca o tempo acumulado (não consolidado) de uma tarefa',
  security: [{ cookieAuth: [] }],
  tags: ['Time Log'],
  request: {
    params: taskIdSchema,
  },
  responses: {
    200: {
      description: 'Tempo pendente retornado com sucesso',
      content: { 'application/json': { schema: pendingTimeResponseSchema } },
    },
    400: {
      description: 'ID da tarefa inválido',
      content: { 'application/json': { schema: rfc7807ErrorSchema } },
    },
    401: { description: 'Não autorizado' },
  },
});

// --- Execução Física das Rotas do Express ---
router.use(ensureAuthenticated);

router.post('/', taskController.create);
router.get('/', taskController.findAll);
router.get('/:id', taskController.findById);
router.patch('/:id', taskController.update);
router.delete('/:id', taskController.delete);

// --- Rotas de Time Tracking (Play/Pause e Stop) ---
router.post('/:id/timer/toggle', timeTrackingController.toggleTimer);
router.get('/:id/timer/pending', timeTrackingController.getPending);

export default router;
