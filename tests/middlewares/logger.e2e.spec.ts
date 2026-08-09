import request from 'supertest';
import { createApp } from '../../src/app';
import { describe, expect, it } from 'vitest';
import { logger } from '../../src/utils/logger';
import { pinoHttp } from 'pino-http';

describe('[E2E] Logger Configuration & Middleware', () => {
  it('should have logger level set to silent in the test environment', () => {
    // Garante que o ambiente de testes nunca será poluído com logs acidentais
    expect(process.env.NODE_ENV).toBe('test');
    expect(logger.level).toBe('silent');
  });

  it('should use the logger inside a route lifecycle', async () => {
    const app = createApp();

    // Injetamos o middleware com a sua configuração
    app.use(pinoHttp({ logger, autoLogging: false }));

    // Criamos uma rota de teste para validar a injeção do logger
    app.get('/test-injection', (req, res) => {
      // Validação: o pino-http colocou o logger dentro do req?
      expect(req.log).toBeDefined();
      expect(typeof req.log.info).toBe('function');
      expect(typeof req.log.error).toBe('function');

      res.status(200).json({ success: true });
    });

    // 3. Disparamos a requisição e validamos
    const response = await request(app).get('/test-injection');

    expect(response.status).toBe(200);
  });
});
