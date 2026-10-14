import { Router } from 'express';
import {
  registry,
  assistantChatRequestSchema,
  assistantChatResponseSchema,
  assistantHistoryResponseSchema,
  assistantClearResponseSchema,
  assistantContextResponseSchema,
  rfc7807ErrorSchema,
} from '@lib/shared';
import { AssistantController } from './assistant.controller';
import { ensureAuthenticated } from '../../middleware/ensureAuthenticated';

const router = Router();
const controller = new AssistantController();

registry.registerPath({
  method: 'get',
  path: '/assistant/context',
  summary: 'Obtém o contexto agronômico do produtor para o assistente',
  tags: ['Assistant'],
  security: [{ cookieAuth: [] }],
  responses: {
    200: {
      description: 'Contexto do produtor retornado com sucesso',
      content: {
        'application/json': { schema: assistantContextResponseSchema },
      },
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/assistant/messages',
  summary: 'Obtém o histórico de mensagens da conversa com o assistente',
  tags: ['Assistant'],
  security: [{ cookieAuth: [] }],
  responses: {
    200: {
      description: 'Histórico de mensagens retornado com sucesso',
      content: {
        'application/json': { schema: assistantHistoryResponseSchema },
      },
    },
  },
});

registry.registerPath({
  method: 'delete',
  path: '/assistant/messages',
  summary: 'Limpa o histórico de mensagens da conversa com o assistente',
  tags: ['Assistant'],
  security: [{ cookieAuth: [] }],
  responses: {
    200: {
      description: 'Histórico de mensagens limpo com sucesso',
      content: {
        'application/json': { schema: assistantClearResponseSchema },
      },
    },
  },
});

registry.registerPath({
  method: 'post',
  path: '/assistant/chat',
  summary: 'Envia mensagem para o assistente Sulflux (Gemini AI grounded)',
  tags: ['Assistant'],
  security: [{ cookieAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': { schema: assistantChatRequestSchema },
      },
    },
  },
  responses: {
    200: {
      description: 'Resposta do assistente retornada com sucesso',
      content: {
        'application/json': { schema: assistantChatResponseSchema },
      },
    },
    400: {
      description: 'Erro de validação',
      content: { 'application/json': { schema: rfc7807ErrorSchema } },
    },
  },
});

router.get('/context', ensureAuthenticated, controller.getContext);
router.get('/messages', ensureAuthenticated, controller.getMessages);
router.delete('/messages', ensureAuthenticated, controller.clearMessages);
router.post('/chat', ensureAuthenticated, controller.sendMessage);

export default router;
