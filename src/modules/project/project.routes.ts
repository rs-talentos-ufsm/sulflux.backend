import { Router } from 'express';
import {
  registry,
  z,
  createProjectSchema,
  updateProjectSchema,
  projectIdSchema,
  projectResponseSchema,
  rfc7807ErrorSchema,
  createPaginatedResponseSchema,
} from '@lib/shared';
import { ProjectController } from './project.controller.js';
import { ensureAuthenticated } from '../../middleware/ensureAuthenticated.js';

const router = Router();
const projectController = new ProjectController();

// --- Registro das Rotas no OpenAPI Registry ---

// Rota: Criar Tarefa
registry.registerPath({
  method: 'post',
  path: '/projects',
  summary: 'Cria um novo projeto',
  tags: ['Project'],
  request: {
    body: {
      content: {
        'application/json': {
          schema: createProjectSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Tarefa criada com sucesso',
      content: { 'application/json': { schema: projectResponseSchema } },
    },
    400: {
      description: 'Dados inválidos ou erro de validação',
      content: { 'application/json': { schema: rfc7807ErrorSchema } },
    },
  },
});

// Rota: Listar Projetos Paginados
const projectPaginatedResponseSchema = createPaginatedResponseSchema(
  projectResponseSchema,
  'ProjectPaginatedResponse',
);

registry.registerPath({
  method: 'get',
  path: '/projects',
  summary: 'Lista projetos com paginação',
  security: [{ cookieAuth: [] }],
  tags: ['Project'],
  request: {
    query: z.object({
      page: z.coerce.number().optional().default(1),
      limit: z.coerce.number().optional().default(10),
    }),
  },
  responses: {
    200: {
      description: 'Lista de projetos retornada com sucesso',
      content: {
        'application/json': { schema: projectPaginatedResponseSchema },
      }, // { data: [...], meta: {...} }
    },
    401: { description: 'Não autorizado' },
  },
});

// Rota: Buscar por ID
registry.registerPath({
  method: 'get',
  path: '/projects/{id}',
  summary: 'Busca um projeto pelo ID',
  security: [{ cookieAuth: [] }],
  tags: ['Project'],
  request: { params: projectIdSchema },
  responses: {
    200: {
      description: 'Projeto encontrado',
      content: { 'application/json': { schema: projectResponseSchema } },
    },
    401: { description: 'Não autorizado' },
    404: {
      description: 'Projeto não encontrado',
      content: { 'application/json': { schema: rfc7807ErrorSchema } },
    },
  },
});

// Rota: Atualizar Tarefa
registry.registerPath({
  method: 'patch',
  path: '/projects/{id}',
  summary: 'Atualiza dados de um projeto existente',
  security: [{ cookieAuth: [] }],
  tags: ['Project'],
  request: {
    params: projectIdSchema,
    body: {
      content: {
        'application/json': {
          schema: updateProjectSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Projeto atualizado com sucesso',
      content: { 'application/json': { schema: projectResponseSchema } },
    },
    400: {
      description: 'Dados fornecidos inválidos',
      content: { 'application/json': { schema: rfc7807ErrorSchema } },
    },
    401: { description: 'Não autorizado' },
    404: {
      description: 'Projeto não encontrado',
      content: { 'application/json': { schema: rfc7807ErrorSchema } },
    },
  },
});

// Rota: Soft Delete de Tarefa
registry.registerPath({
  method: 'delete',
  path: '/projects/{id}',
  summary: 'Remove logicamente um projeto',
  security: [{ cookieAuth: [] }],
  tags: ['Project'],
  request: { params: projectIdSchema },
  responses: {
    200: {
      description: 'Projeto removido com sucesso (sem retorno de conteúdo)',
    },
    401: { description: 'Não autorizado' },
    404: {
      description: 'Projeto não encontrado',
      content: { 'application/json': { schema: rfc7807ErrorSchema } },
    },
  },
});

// --- Execução Física das Rotas do Express ---
router.use(ensureAuthenticated);

router.post('/', projectController.create);
router.get('/', projectController.findAll);
router.get('/:id', projectController.findById);
router.patch('/:id', projectController.update);
router.delete('/:id', projectController.delete);

export default router;
