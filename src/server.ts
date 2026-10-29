import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';

// Carrega variáveis de ambiente corretas antes de iniciar
if (!process.env.BACKEND_PORT || !process.env.DATABASE_URL) {
  const isProd = process.env.NODE_ENV === 'production';
  const envFile = isProd
    ? fs.existsSync(path.resolve(process.cwd(), '.env.production'))
      ? '.env.production'
      : '.env'
    : fs.existsSync(path.resolve(process.cwd(), '.env.development'))
      ? '.env.development'
      : '.env';
  dotenv.config({ path: envFile });
  dotenv.config();
}

import { otelSDK } from './observability/tracing';
otelSDK.start();

const PORT = process.env.BACKEND_PORT || 5001;

async function bootstrap() {
  try {
    const { createApp } = await import('./app');
    const { logger } = await import('./utils/logger');
    const { ensureDatabaseSchema } = await import('./infra/database');

    await ensureDatabaseSchema();

    const app = createApp();

    const server = app.listen(PORT as number, '0.0.0.0', () => {
      logger.info(`🚀 Server running on port ${PORT}`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('🛑 SIGTERM received. Shutting down...');
      otelSDK.shutdown();
      server.close();
    });

    process.on('SIGINT', () => {
      logger.info('🛑 SIGINT received. Shutting down...');
      otelSDK.shutdown();
      server.close();
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

bootstrap();
