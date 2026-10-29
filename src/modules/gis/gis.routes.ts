import { Router } from 'express';
import {
  registry,
  z,
  shapefileImportResponseSchema,
  confirmShapefileImportSchema,
  rfc7807ErrorSchema,
} from '@lib/shared';
import { GisController } from './gis.controller.js';
import { ensureAuthenticated } from '../../middleware/ensureAuthenticated.js';

const router = Router();
const controller = new GisController();

// OpenAPI documentation
registry.registerPath({
  method: 'post',
  path: '/gis/import-shapefile',
  summary: 'Processa arquivo Shapefile (.zip) e retorna geometrias e métricas',
  tags: ['GIS & Shapefile'],
  security: [{ cookieAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: z.object({
            fileBase64: z.string().openapi({
              description:
                'Conteúdo do arquivo Shapefile (.zip) codificado em Base64',
            }),
            fileName: z.string().optional(),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Shapefile processado com sucesso',
      content: {
        'application/json': { schema: shapefileImportResponseSchema },
      },
    },
    400: {
      description: 'Arquivo inválido ou sem polígonos',
      content: { 'application/json': { schema: rfc7807ErrorSchema } },
    },
  },
});

registry.registerPath({
  method: 'post',
  path: '/gis/confirm-import',
  summary: 'Persiste os talhões importados do Shapefile na propriedade',
  tags: ['GIS & Shapefile'],
  security: [{ cookieAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': { schema: confirmShapefileImportSchema },
      },
    },
  },
  responses: {
    201: {
      description: 'Talhões importados e criados com sucesso',
      content: {
        'application/json': { schema: z.array(z.any()) },
      },
    },
  },
});

router.post(
  '/import-shapefile',
  ensureAuthenticated,
  controller.importShapefile,
);
router.post('/confirm-import', ensureAuthenticated, controller.confirmImport);

export default router;
