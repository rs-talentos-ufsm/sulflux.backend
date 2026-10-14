import { Router } from 'express';
import {
  registry,
  z,
  carbonAnalysisResponseSchema,
  waterAnalysisResponseSchema,
  propertyMonitoringHistorySchema,
  talhaoResultsResponseSchema,
  mapExplorerResponseSchema,
  rfc7807ErrorSchema,
} from '@lib/shared';
import { MonitoringController } from './monitoring.controller';
import { ensureAuthenticated } from '../../middleware/ensureAuthenticated';

const router = Router();
const controller = new MonitoringController();

// Documentação OpenAPI

registry.registerPath({
  method: 'get',
  path: '/monitoring/carbon/{fieldId}',
  summary:
    'Obtém a análise de carbono de um talhão (Eddy Covariance e Sentinel-2A)',
  tags: ['Monitoring'],
  security: [{ cookieAuth: [] }],
  request: {
    params: z.object({ fieldId: z.string().uuid() }),
    query: z.object({ safra: z.string().optional() }),
  },
  responses: {
    200: {
      description: 'Análise de carbono retornada com sucesso',
      content: { 'application/json': { schema: carbonAnalysisResponseSchema } },
    },
    404: {
      description: 'Talhão não encontrado',
      content: { 'application/json': { schema: rfc7807ErrorSchema } },
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/monitoring/water/{fieldId}',
  summary: 'Obtém a análise hídrica de um talhão',
  tags: ['Monitoring'],
  security: [{ cookieAuth: [] }],
  request: {
    params: z.object({ fieldId: z.string().uuid() }),
    query: z.object({ safra: z.string().optional() }),
  },
  responses: {
    200: {
      description: 'Análise hídrica retornada com sucesso',
      content: { 'application/json': { schema: waterAnalysisResponseSchema } },
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/monitoring/history/{propertyId}',
  summary: 'Histórico de monitoramento e linha do tempo de uma propriedade',
  tags: ['Monitoring'],
  security: [{ cookieAuth: [] }],
  request: {
    params: z.object({ propertyId: z.string().uuid() }),
  },
  responses: {
    200: {
      description: 'Histórico de monitoramento retornado com sucesso',
      content: {
        'application/json': { schema: propertyMonitoringHistorySchema },
      },
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/monitoring/results/{fieldId}',
  summary: 'Resultados e KPIs consolidados de um talhão',
  tags: ['Monitoring'],
  security: [{ cookieAuth: [] }],
  request: {
    params: z.object({ fieldId: z.string().uuid() }),
  },
  responses: {
    200: {
      description: 'Resultados do talhão retornados com sucesso',
      content: { 'application/json': { schema: talhaoResultsResponseSchema } },
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/monitoring/map',
  summary: 'Dados de talhões para o mapa interativo',
  tags: ['Monitoring'],
  security: [{ cookieAuth: [] }],
  responses: {
    200: {
      description: 'Talhões para o mapa retornados com sucesso',
      content: { 'application/json': { schema: mapExplorerResponseSchema } },
    },
  },
});

// Rotas Express
router.get(
  '/carbon/:fieldId',
  ensureAuthenticated,
  controller.getCarbonAnalysis,
);
router.get('/water/:fieldId', ensureAuthenticated, controller.getWaterAnalysis);
router.get(
  '/history/:propertyId',
  ensureAuthenticated,
  controller.getPropertyMonitoringHistory,
);
router.get(
  '/results/:fieldId',
  ensureAuthenticated,
  controller.getTalhaoResults,
);
router.get('/map', ensureAuthenticated, controller.getMapExplorerData);

export default router;
