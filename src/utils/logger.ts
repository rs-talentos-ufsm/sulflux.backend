import pino from 'pino';

// Em produção, queremos velocidade máxima (JSON puro).
// Em desenvolvimento, queremos legibilidade no terminal.
const isDevelopment = process.env.NODE_ENV === 'development';
const isTest = process.env.NODE_ENV === 'test';

export const logger = pino({
  level: isTest ? 'silent' : process.env.LOG_LEVEL || 'info',
  transport: isDevelopment
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname', // Oculta dados de infraestrutura local
        },
      }
    : undefined,
}); // Em produção, desativa o transport para manter o JSON bruto
