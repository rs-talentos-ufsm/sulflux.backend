import { otelSDK } from './observability/tracing';
otelSDK.start();

const PORT = process.env.BACKEND_PORT || 5000;

async function bootstrap() {
  try {
    const { createApp } = await import('./app');
    const { logger } = await import('./utils/logger');

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
