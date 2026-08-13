import { Router } from 'express';
import {
  registry,
  z,
  createFieldSchema,
  updateFieldSchema,
  fieldIdSchema,
  fieldResponseSchema,
  rfc7807ErrorSchema,
  createPaginatedResponseSchema,
  fieldQuerySchema,
} from '@lib/shared';
import { FieldController } from './field.controller';
import { ensureAuthenticated } from '../../middleware/ensureAuthenticated';

const router = Router();
const fieldController = new FieldController();

const fieldPaginatedResponseSchema = createPaginatedResponseSchema(
  fieldResponseSchema,
  'FieldPaginatedResponse',
);

// --- Registro das Rotas no OpenAPI Registry ---

registry.registerPath({
  method: 'post',
  path: '/fields',
  summary: 'Cria um novo talhão',
  tags: ['Field'],
  security: [{ cookieAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': { schema: createFieldSchema },
      },
    },
  },
  responses: {
    201: {
      description: 'Talhão criado com sucesso',
      content: { 'application/json': { schema: fieldResponseSchema } },
    },
    400: {
      description: 'Dados inválidos ou erro de validação',
      content: { 'application/json': { schema: rfc7807ErrorSchema } },
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/fields',
  summary: 'Lista talhões com paginação e filtros',
  security: [{ cookieAuth: [] }],
  tags: ['Field'],
  request: { query: fieldQuerySchema },
  responses: {
    200: {
      description: 'Lista de talhões retornada com sucesso',
      content: {
        'application/json': { schema: fieldPaginatedResponseSchema },
      },
    },
    401: { description: 'Não autorizado' },
  },
});

registry.registerPath({
  method: 'get',
  path: '/fields/{id}',
  summary: 'Busca um talhão pelo ID',
  security: [{ cookieAuth: [] }],
  tags: ['Field'],
  request: { params: fieldIdSchema },
  responses: {
    200: {
      description: 'Talhão encontrado',
      content: { 'application/json': { schema: fieldResponseSchema } },
    },
    401: { description: 'Não autorizado' },
    404: {
      description: 'Talhão não encontrado',
      content: { 'application/json': { schema: rfc7807ErrorSchema } },
    },
  },
});

registry.registerPath({
  method: 'patch',
  path: '/fields/{id}',
  summary: 'Atualiza dados de um talhão existente',
  security: [{ cookieAuth: [] }],
  tags: ['Field'],
  request: {
    params: fieldIdSchema,
    body: {
      content: {
        'application/json': { schema: updateFieldSchema },
      },
    },
  },
  responses: {
    200: {
      description: 'Talhão atualizado com sucesso',
      content: { 'application/json': { schema: fieldResponseSchema } },
    },
    400: {
      description: 'Dados fornecidos inválidos',
      content: { 'application/json': { schema: rfc7807ErrorSchema } },
    },
    401: { description: 'Não autorizado' },
    403: { description: 'Permissão negada' },
    404: {
      description: 'Talhão não encontrado',
      content: { 'application/json': { schema: rfc7807ErrorSchema } },
    },
  },
});

registry.registerPath({
  method: 'delete',
  path: '/fields/{id}',
  summary: 'Deleta um talhão',
  security: [{ cookieAuth: [] }],
  tags: ['Field'],
  request: { params: fieldIdSchema },
  responses: {
    204: {
      description: 'Talhão removido com sucesso (sem retorno de conteúdo)',
    },
    401: { description: 'Não autorizado' },
    403: { description: 'Permissão negada' },
    404: {
      description: 'Talhão não encontrado',
      content: { 'application/json': { schema: rfc7807ErrorSchema } },
    },
  },
});

// --- Execução Física das Rotas do Express ---
router.use(ensureAuthenticated);

router.post('/', fieldController.create);
router.get('/', fieldController.findAll);
router.get('/:id', fieldController.findById);
router.patch('/:id', fieldController.update);
router.delete('/:id', fieldController.delete);

export default router;
