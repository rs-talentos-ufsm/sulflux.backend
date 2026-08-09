import request from 'supertest';
import { createApp } from '../../src/app';
import { describe, expect, it } from 'vitest';

describe('[E2E] Security Headers Middleware', () => {
  const app = createApp();

  it('should inject helmet security headers and remove x-powered-by', async () => {
    const response = await request(app).get('/api/health');

    // Garante que a rota respondeu corretamente
    expect(response.status).toBe(200);

    // 1. Verifica se o header que vaza a tecnologia (Express) foi removido
    expect(response.headers['x-powered-by']).toBeUndefined();

    // 2. Verifica a injeção dos cabeçalhos estáticos do Helmet
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(response.headers['x-xss-protection']).toBe('0');
    expect(response.headers['x-dns-prefetch-control']).toBe('off');
    expect(response.headers['x-download-options']).toBe('noopen');
    expect(response.headers['x-permitted-cross-domain-policies']).toBe('none');
    expect(response.headers['referrer-policy']).toBe('no-referrer');
    expect(response.headers['cross-origin-opener-policy']).toBe('same-origin');
    expect(response.headers['cross-origin-resource-policy']).toBe(
      'same-origin',
    );

    // 3. Verifica os cabeçalhos mais complexos (HSTS e CSP)
    // Usamos toContain para não quebrar o teste caso você adicione novas regras no CSP no futuro
    expect(response.headers['strict-transport-security']).toContain(
      'max-age=31536000',
    );
    expect(response.headers['content-security-policy']).toContain(
      "default-src 'self'",
    );
  });
});
