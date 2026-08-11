import { Router } from 'express';
import {
  registry,
  z,
  createPropertySchema,
  updatePropertySchema,
  propertyIdSchema,
  propertyResponseSchema,
  rfc7807ErrorSchema,
  createPaginatedResponseSchema,
  propertyQuerySchema,
} from '@lib/shared';
import { PropertyController } from './property.controller.js';
import { ensureAuthenticated } from '../../middleware/ensureAuthenticated.js';

const router = Router();
const propertyController = new PropertyController();

const propertyPaginatedResponseSchema = createPaginatedResponseSchema(
  propertyResponseSchema,
  'PropertyPaginatedResponse',
);

// --- Registro das Rotas no OpenAPI Registry ---

// Rota: Criar Propriedade
registry.registerPath({
  method: 'post',
  path: '/properties',
  summary: 'Cria uma nova propriedade',
  tags: ['Property'],
  security: [{ cookieAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': { schema: createPropertySchema },
      },
    },
  },
  responses: {
    201: {
      description: 'Propriedade criada com sucesso',
      content: { 'application/json': { schema: propertyResponseSchema } },
    },
    400: {
      description: 'Dados inválidos ou erro de validação',
      content: { 'application/json': { schema: rfc7807ErrorSchema } },
    },
  },
});

// Rota: Listar Propriedades Paginadas
registry.registerPath({
  method: 'get',
  path: '/properties',
  summary: 'Lista propriedades com paginação e filtros',
  security: [{ cookieAuth: [] }],
  tags: ['Property'],
  request: { query: propertyQuerySchema },
  responses: {
    200: {
      description: 'Lista de propriedades retornada com sucesso',
      content: {
        'application/json': { schema: propertyPaginatedResponseSchema },
      },
    },
    401: { description: 'Não autorizado' },
  },
});

// Rota: Buscar Propriedade por ID
registry.registerPath({
  method: 'get',
  path: '/properties/{id}',
  summary: 'Busca uma propriedade pelo ID',
  security: [{ cookieAuth: [] }],
  tags: ['Property'],
  request: { params: propertyIdSchema },
  responses: {
    200: {
      description: 'Propriedade encontrada',
      content: { 'application/json': { schema: propertyResponseSchema } },
    },
    401: { description: 'Não autorizado' },
    404: {
      description: 'Propriedade não encontrada',
      content: { 'application/json': { schema: rfc7807ErrorSchema } },
    },
  },
});

// Rota: Atualizar Propriedade
registry.registerPath({
  method: 'patch',
  path: '/properties/{id}',
  summary: 'Atualiza dados de uma propriedade existente',
  security: [{ cookieAuth: [] }],
  tags: ['Property'],
  request: {
    params: propertyIdSchema,
    body: {
      content: {
        'application/json': { schema: updatePropertySchema },
      },
    },
  },
  responses: {
    200: {
      description: 'Propriedade atualizada com sucesso',
      content: { 'application/json': { schema: propertyResponseSchema } },
    },
    400: {
      description: 'Dados fornecidos inválidos',
      content: { 'application/json': { schema: rfc7807ErrorSchema } },
    },
    401: { description: 'Não autorizado' },
    403: { description: 'Permissão negada' },
    404: {
      description: 'Propriedade não encontrada',
      content: { 'application/json': { schema: rfc7807ErrorSchema } },
    },
  },
});

// Rota: Deletar Propriedade
registry.registerPath({
  method: 'delete',
  path: '/properties/{id}',
  summary: 'Deleta uma propriedade',
  security: [{ cookieAuth: [] }],
  tags: ['Property'],
  request: { params: propertyIdSchema },
  responses: {
    204: {
      description: 'Propriedade removida com sucesso (sem retorno de conteúdo)',
    },
    401: { description: 'Não autorizado' },
    403: { description: 'Permissão negada' },
    404: {
      description: 'Propriedade não encontrada',
      content: { 'application/json': { schema: rfc7807ErrorSchema } },
    },
  },
});

// --- Execução Física das Rotas do Express ---
router.use(ensureAuthenticated);

router.post('/', propertyController.create);
router.get('/', propertyController.findAll);
router.get('/:id', propertyController.findById);
router.patch('/:id', propertyController.update);
router.delete('/:id', propertyController.delete);

export default router;
