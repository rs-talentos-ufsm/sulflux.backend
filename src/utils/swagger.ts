import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';
import { registry, OpenApiGeneratorV3 } from '@lib/shared';

export const setupSwagger = (app: Express): void => {
  registry.registerComponent('securitySchemes', 'cookieAuth', {
    type: 'apiKey',
    in: 'cookie',
    name: 'accessToken', // O exato nome lido em req.cookies.accessToken
    description:
      'Autenticação automática via cookie HttpOnly obtido na rota de login.',
  });

  const generator = new OpenApiGeneratorV3(registry.definitions);

  const document = generator.generateDocument({
    openapi: '3.0.0',
    info: {
      title: 'API Integrada - Especificação Técnica',
      version: '1.0.0',
      description: 'Documentação gerada automaticamente via Zod Registry.',
    },
    servers: [
      {
        url:
          process.env.API_URL ||
          `http://localhost:${process.env.BACKEND_PORT || 5001}/api`,
      },
    ],
  });

  // Rota para o JSON bruto (útil para debug)
  app.get('/api-docs.json', (req, res) => res.json(document));

  // Rota para a interface do Swagger UI
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(document));
};
