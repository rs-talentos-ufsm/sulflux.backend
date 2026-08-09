import { Router } from 'express';
import {
  registry,
  loginSchema,
  createUserSchema,
  userResponseSchema,
  rfc7807ErrorSchema,
} from '@lib/shared';
import { AuthController } from './auth.controller';
import { ensureAuthenticated } from '../../middleware/ensureAuthenticated';

const router = Router();
const authController = new AuthController();

// --- Registro das Rotas no OpenAPI Registry ---

// ROTA: Login
registry.registerPath({
  method: 'post',
  path: '/auth/login',
  summary: 'Realiza o login do usuário',
  tags: ['Auth'],
  request: {
    body: {
      content: {
        'application/json': { schema: loginSchema },
      },
    },
  },
  responses: {
    200: {
      description: 'Sucesso na autenticação',
      content: { 'application/json': { schema: userResponseSchema } },
    },
    400: {
      description: 'Dados de entrada inválidos',
      content: { 'application/json': { schema: rfc7807ErrorSchema } },
    },
    401: {
      description: 'Credenciais inválidas',
      content: { 'application/json': { schema: rfc7807ErrorSchema } },
    },
    403: {
      description: 'Usuário inativo',
      content: { 'application/json': { schema: rfc7807ErrorSchema } },
    },
  },
});

// ROTA: Register
registry.registerPath({
  method: 'post',
  path: '/auth/register',
  summary: 'Cria uma nova conta de usuário',
  tags: ['Auth'],
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

// ROTA: Refresh Token
registry.registerPath({
  method: 'post',
  path: '/auth/refresh',
  summary: 'Renova o token de acesso',
  tags: ['Auth'],
  responses: {
    204: {
      description: 'Novo token gerado e injetado no Cookie HttpOnly',
    },
    401: {
      description: 'Token de renovação inválido ou expirado',
      content: { 'application/json': { schema: rfc7807ErrorSchema } },
    },
  },
});

// ROTA: Logout
registry.registerPath({
  method: 'post',
  path: '/auth/logout',
  summary: 'Encerra a sessão do usuário',
  security: [{ cookieAuth: [] }],
  tags: ['Auth'],
  responses: {
    204: {
      description: 'Sessão encerrada com sucesso',
    },
    401: {
      description: 'Não autorizado',
      content: { 'application/json': { schema: rfc7807ErrorSchema } },
    },
  },
});

// ROTA: Get Me
registry.registerPath({
  method: 'get',
  path: '/auth/me',
  summary: 'Obtém dados do usuário autenticado através da sessão',
  security: [{ cookieAuth: [] }],
  tags: ['Auth'],
  responses: {
    200: {
      description: 'Dados do perfil do usuário logado',
      content: {
        'application/json': { schema: userResponseSchema },
      },
    },
    401: {
      description: 'Não autorizado',
      content: { 'application/json': { schema: rfc7807ErrorSchema } },
    },
    404: {
      description: 'Usuário não encontrado',
      content: { 'application/json': { schema: rfc7807ErrorSchema } },
    },
  },
});

// --- Execução Física das Rotas do Express ---
router.post('/login', authController.login);
router.post('/register', authController.register);
router.post('/refresh', authController.refreshToken);

router.use(ensureAuthenticated);
router.get('/me', authController.getMe);
router.post('/logout', authController.logout);

export default router;
