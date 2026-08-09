import { Router } from 'express';
import {
  registry,
  createUserSchema,
  updateUserSchema,
  userIdSchema,
  userResponseSchema,
  rfc7807ErrorSchema,
  paginationSchema,
  createPaginatedResponseSchema,
} from '@lib/shared';
import { UserController } from './user.controller.js';
import { ensureAuthenticated } from '../../middleware/ensureAuthenticated.js';

const router = Router();
const userController = new UserController();

// Cria o schema paginado para a documentação
const userPaginatedResponseSchema = createPaginatedResponseSchema(
  userResponseSchema,
  'UserPaginatedResponse',
);

// --- Registro das Rotas no OpenAPI Registry ---

// Rota: Criar Usuário
registry.registerPath({
  method: 'post',
  path: '/users',
  summary: 'Cria um novo usuário',
  tags: ['User'],
  request: {
    body: {
      content: {
        'application/json': { schema: createUserSchema },
      },
    },
  },
  responses: {
    201: {
      description: 'Usuário criado com sucesso',
      content: { 'application/json': { schema: userResponseSchema } },
    },
    400: {
      description: 'Dados inválidos ou erro de validação',
      content: { 'application/json': { schema: rfc7807ErrorSchema } },
    },
    409: {
      description: 'Conflito: E-mail já cadastrado',
      content: { 'application/json': { schema: rfc7807ErrorSchema } },
    },
  },
});

// Rota: Listar Usuários Paginados
registry.registerPath({
  method: 'get',
  path: '/users',
  summary: 'Lista usuários com paginação',
  security: [{ cookieAuth: [] }],
  tags: ['User'],
  request: {
    query: paginationSchema, // Usa o schema genérico
  },
  responses: {
    200: {
      description: 'Lista de usuários retornada com sucesso',
      content: { 'application/json': { schema: userPaginatedResponseSchema } },
    },
    401: { description: 'Não autorizado' },
  },
});

// Rota: Buscar por ID
registry.registerPath({
  method: 'get',
  path: '/users/{id}',
  summary: 'Busca um usuário pelo ID',
  security: [{ cookieAuth: [] }],
  tags: ['User'],
  request: { params: userIdSchema },
  responses: {
    200: {
      description: 'Usuário encontrado',
      content: { 'application/json': { schema: userResponseSchema } },
    },
    401: { description: 'Não autorizado' },
    404: {
      description: 'Usuário não encontrado',
      content: { 'application/json': { schema: rfc7807ErrorSchema } },
    },
  },
});

// Rota: Atualizar Usuário
registry.registerPath({
  method: 'patch',
  path: '/users/{id}',
  summary: 'Atualiza dados de um usuário existente',
  security: [{ cookieAuth: [] }],
  tags: ['User'],
  request: {
    params: userIdSchema,
    body: {
      content: {
        'application/json': { schema: updateUserSchema },
      },
    },
  },
  responses: {
    200: {
      description: 'Usuário atualizado com sucesso',
      content: { 'application/json': { schema: userResponseSchema } },
    },
    400: {
      description: 'Dados fornecidos inválidos',
      content: { 'application/json': { schema: rfc7807ErrorSchema } },
    },
    401: { description: 'Não autorizado' },
    404: {
      description: 'Usuário não encontrado',
      content: { 'application/json': { schema: rfc7807ErrorSchema } },
    },
  },
});

// Rota: Soft Delete de Usuário
registry.registerPath({
  method: 'delete',
  path: '/users/{id}',
  summary: 'Remove logicamente um usuário',
  security: [{ cookieAuth: [] }],
  tags: ['User'],
  request: { params: userIdSchema },
  responses: {
    204: {
      description: 'Usuário removido com sucesso (Sem conteúdo)',
    },
    401: { description: 'Não autorizado' },
    404: {
      description: 'Usuário não encontrado',
      content: { 'application/json': { schema: rfc7807ErrorSchema } },
    },
  },
});

// --- Execução Física das Rotas do Express ---

/**
 * Rota pública: Registro de usuário
 */
router.post('/', userController.create);

/**
 * Rotas Protegidas
 */
router.use(ensureAuthenticated);

router.get('/', userController.findAll);
router.get('/:id', userController.findById);
router.patch('/:id', userController.update);
router.delete('/:id', userController.delete);

export default router;
