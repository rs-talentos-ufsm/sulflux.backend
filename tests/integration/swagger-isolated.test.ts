import { describe, it, expect } from 'vitest';
import { z } from '@lib/shared';
import {
  extendZodWithOpenApi,
  OpenAPIRegistry,
  OpenApiGeneratorV3,
} from '@asteasolutions/zod-to-openapi';

describe('Prova Real - Zod para OpenAPI', () => {
  it('DEVE registrar o schema no componente se rodar no mesmo arquivo', () => {
    // 1. Setup inicial no mesmo escopo
    extendZodWithOpenApi(z);
    const registryLocal = new OpenAPIRegistry();

    // 2. Registro do Schema exato
    const schemaLocal = registryLocal.register(
      'LoginRequestTeste',
      z.object({
        email: z.email(),
        password: z.string().min(8),
      }),
    );

    // 3. Registro de uma rota qualquer usando o schema
    registryLocal.registerPath({
      method: 'post',
      path: '/auth/test',
      responses: {
        200: {
          description: 'Ok',
          content: { 'application/json': { schema: schemaLocal } },
        },
      },
    });

    // 4. Geração do Documento
    const generator = new OpenApiGeneratorV3(registryLocal.definitions);
    const document = generator.generateDocument({
      openapi: '3.0.0',
      info: { title: 'Teste de Isolamento', version: '1.0.0' },
    });

    // 5. Vamos printar no console para ver com os próprios olhos
    // console.log('RESULTADO DO COMPONENTS:', JSON.stringify(document.components, null, 2));

    // 6. A asserção final
    expect(document.components?.schemas?.LoginRequestTeste).toBeDefined();
  });
});
