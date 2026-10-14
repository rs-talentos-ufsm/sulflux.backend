import { Router } from 'express';
import {
  registry,
  z,
  saveSeasonCyclesSchema,
  cropCycleResponseSchema,
  rfc7807ErrorSchema,
} from '@lib/shared';
import { CycleController } from './cycle.controller';
import { ensureAuthenticated } from '../../middleware/ensureAuthenticated';

const router = Router();
const controller = new CycleController();

registry.registerPath({
  method: 'get',
  path: '/cycles/field/{fieldId}',
  summary: 'Obtém todos os ciclos e insumos de um talhão',
  tags: ['CropCycle'],
  security: [{ cookieAuth: [] }],
  request: {
    params: z.object({ fieldId: z.string().uuid() }),
  },
  responses: {
    200: {
      description: 'Lista de ciclos retornada com sucesso',
      content: {
        'application/json': { schema: z.array(cropCycleResponseSchema) },
      },
    },
  },
});

registry.registerPath({
  method: 'post',
  path: '/cycles/field/{fieldId}/season',
  summary: 'Salva todas as fases e insumos da safra de um talhão',
  tags: ['CropCycle'],
  security: [{ cookieAuth: [] }],
  request: {
    params: z.object({ fieldId: z.string().uuid() }),
    body: {
      content: {
        'application/json': { schema: saveSeasonCyclesSchema },
      },
    },
  },
  responses: {
    200: {
      description: 'Fases e insumos salvos com sucesso',
      content: {
        'application/json': { schema: z.array(cropCycleResponseSchema) },
      },
    },
    400: {
      description: 'Erro de validação',
      content: { 'application/json': { schema: rfc7807ErrorSchema } },
    },
  },
});

router.get('/field/:fieldId', ensureAuthenticated, controller.getByField);
router.post(
  '/field/:fieldId/season',
  ensureAuthenticated,
  controller.saveSeasonCycles,
);

export default router;
