import request from 'supertest';
import { createApp } from '../../src/app';
import { describe, expect, it } from 'vitest';
import { logIfFail } from '../helpers/testLogger';

describe('Healthcheck', () => {
  const app = createApp();

  it('should return status ok', async () => {
    const response = await request(app).get('/api/health');

    // Verifica erros
    logIfFail(response);

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
  });
});
