import request from 'supertest';
import { createApp } from '../../src/app';
import { describe, expect, it } from 'vitest';

describe('[E2E] Rate Limit Middleware', () => {
  it('should block requests after exceeding the rate limit', async () => {
    const app = createApp();

    const TEST_LIMIT = 5; // Limite definido para ambiente de teste no app.ts

    // Rota utilizada para testar o Rate Limit (pode ser qualquer rota, desde que exista no app)
    const endpoint = '/api/health';

    // 1. Dispara requisições até o limite permitido
    for (let i = 0; i < TEST_LIMIT; i++) {
      const response = await request(app).get(endpoint);

      // Enquanto estiver dentro do limite, a rota de health deve retornar 200
      expect(response.status).toBe(200);

      // O Rate Limit injeta headers informativos que podemos validar (opcional)
      expect(response.headers).toHaveProperty('ratelimit-limit');
      expect(response.headers).toHaveProperty('ratelimit-remaining');
    }

    // 2. A PRÓXIMA requisição deve ser bloqueada
    const blockedResponse = await request(app).get(endpoint);

    // 3. Verifica se o Rate Limit agiu corretamente
    expect(blockedResponse.status).toBe(429); // 429 Too Many Requests
    expect(blockedResponse.body.message).toContain(
      'Você excedeu o limite de requisições. Por favor, tente novamente mais tarde.',
    );
  });
});
