import { Router } from 'express';
import {
  registry,
  z,
  createDocumentSchema,
  documentResponseSchema,
  documentFolderSchema,
  rfc7807ErrorSchema,
} from '@lib/shared';
import { DocumentController } from './document.controller';
import { ensureAuthenticated } from '../../middleware/ensureAuthenticated';

const router = Router();
const controller = new DocumentController();

registry.registerPath({
  method: 'get',
  path: '/documents',
  summary: 'Lista documentos agrícolas e laudos do usuário',
  tags: ['Documents'],
  security: [{ cookieAuth: [] }],
  request: {
    query: z.object({
      search: z.string().optional(),
      folder: z.string().optional(),
    }),
  },
  responses: {
    200: {
      description: 'Lista de documentos retornada com sucesso',
      content: {
        'application/json': { schema: z.array(documentResponseSchema) },
      },
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/documents/folders',
  summary: 'Lista pastas e contadores de documentos',
  tags: ['Documents'],
  security: [{ cookieAuth: [] }],
  responses: {
    200: {
      description: 'Pastas de documentos retornadas com sucesso',
      content: {
        'application/json': { schema: z.array(documentFolderSchema) },
      },
    },
  },
});

registry.registerPath({
  method: 'post',
  path: '/documents',
  summary: 'Registra um novo documento',
  tags: ['Documents'],
  security: [{ cookieAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': { schema: createDocumentSchema },
      },
    },
  },
  responses: {
    201: {
      description: 'Documento registrado com sucesso',
      content: { 'application/json': { schema: documentResponseSchema } },
    },
    400: {
      description: 'Erro de validação',
      content: { 'application/json': { schema: rfc7807ErrorSchema } },
    },
  },
});

registry.registerPath({
  method: 'delete',
  path: '/documents/{id}',
  summary: 'Exclui um documento',
  tags: ['Documents'],
  security: [{ cookieAuth: [] }],
  request: {
    params: z.object({ id: z.string().uuid() }),
  },
  responses: {
    204: { description: 'Documento excluído com sucesso' },
    404: {
      description: 'Documento não encontrado',
      content: { 'application/json': { schema: rfc7807ErrorSchema } },
    },
  },
});

router.get('/', ensureAuthenticated, controller.list);
router.get('/folders', ensureAuthenticated, controller.getFolders);
router.post('/', ensureAuthenticated, controller.create);
router.delete('/:id', ensureAuthenticated, controller.delete);

export default router;
