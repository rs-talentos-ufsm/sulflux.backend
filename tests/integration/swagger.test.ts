import { describe, it, expect } from 'vitest';
import { OpenApiGeneratorV3 } from '@asteasolutions/zod-to-openapi';

// Importa o registry que contém todas as definições das suas rotas e schemas
import { registry } from '@lib/shared';
import { createApp } from '../../src/app';
import request from 'supertest';

describe('Swagger & Zod OpenAPI Generation', () => {
  // Cria o documento base uma vez para usar nos testes
  const getDocument = () => {
    const generator = new OpenApiGeneratorV3(registry.definitions);
    return generator.generateDocument({
      openapi: '3.0.0',
      info: {
        title: 'API Integrada - Teste',
        version: '1.0.0',
      },
    });
  };

  it('deve gerar um documento OpenAPI 3.0.0 válido sem erros', () => {
    const document = getDocument();

    expect(document.openapi).toBe('3.0.0');
    expect(document.info.title).toBe('API Integrada - Teste');
    // Garante que o objeto gerado não é vazio
    expect(Object.keys(document).length).toBeGreaterThan(0);
  });

  it('deve expor o documento OpenAPI com schemas e rotas integradas', async () => {
    // Inicia a aplicação real
    const app = createApp();

    // Faz a requisição na rota oficial do Swagger JSON do seu backend
    const response = await request(app as any).get('/api-docs.json');

    // Garante que a rota existe
    expect(response.status).toBe(200);

    const document = response.body;

    // Verificações
    expect(document.openapi).toBe('3.0.0');

    // Verifica se a biblioteca parou de apagar os schemas (porque agora as rotas existem)
    const schemas = document.components?.schemas;
    expect(schemas).toBeDefined();
    expect(schemas.LoginRequest).toBeDefined();
    expect(schemas.RefreshTokenRequest).toBeDefined();

    // Verifica se as rotas amarraram os schemas
    const paths = document.paths;
    expect(paths['/auth/login']).toBeDefined();
    expect(
      paths['/auth/login'].post.requestBody.content['application/json'].schema
        .$ref,
    ).toBe('#/components/schemas/LoginRequest');
  });

  it('deve mapear corretamente as rotas de autenticação (Paths)', () => {
    const document = getDocument();
    const paths = document.paths;

    expect(paths).toBeDefined();

    // Verifica a existência das rotas
    expect(paths['/auth/login']).toBeDefined();
    expect(paths['/auth/register']).toBeDefined();
    expect(paths['/auth/refresh']).toBeDefined();
    expect(paths['/auth/me']).toBeDefined();
  });

  it('deve validar os detalhes do método POST na rota /auth/login', () => {
    const document = getDocument();
    const loginRoute = document.paths['/auth/login']?.post as any;

    expect(loginRoute).toBeDefined();
    expect(loginRoute.summary).toBe('Realiza o login do usuário');
    expect(loginRoute.tags).toContain('Auth');

    // Verifica se os status HTTP foram documentados
    expect(loginRoute.responses['200']).toBeDefined();
    expect(loginRoute.responses['401']).toBeDefined();
    expect(loginRoute.responses['401'].description).toBe(
      'Credenciais inválidas',
    );
  });
});
