import express, { Express } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { setupSwagger } from './utils/swagger';

// Routes
import mainRouter from './routes/index.js';

// Middleware
import { errorMiddleware } from './middleware/errorMiddleware.js';
import { AppError } from './utils/AppError.js';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { pinoHttp } from 'pino-http';
import { logger } from './utils/logger';

export function createApp(): Express {
  const app: Express = express();

  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max:
      process.env.NODE_ENV === 'development'
        ? 1000
        : process.env.NODE_ENV === 'test'
          ? 5
          : 100, // Limite de 100 requisições por IP
    message: {
      status: 494,
      error: 'Too Many Requests',
      message:
        'Você excedeu o limite de requisições. Por favor, tente novamente mais tarde.',
    },
    standardHeaders: true, // Retorna informações de rate limit nos headers `RateLimit-*`
    legacyHeaders: false, // Desativa os headers `X-RateLimit-*`
  });

  // ======================
  // Configurações de CORS
  // ======================
  const allowedOrigins = [
    process.env.BACKEND_URL,
    process.env.BACKEND_URL + '/',
    process.env.FRONTEND_URL,
    process.env.FRONTEND_URL + '/',
    process.env.ADMIN_URL,
    process.env.ADMIN_URL + '/',
    'http://localhost:5174',
    'http://localhost:5184',
    'http://localhost:5173',
    'http://127.0.0.1:5174',
    'http://127.0.0.1:5184',
    'http://127.0.0.1:5173',
    process.env.VERCEL_FRONTEND_URL,
    process.env.VERCEL_FRONTEND_URL + '/',
    process.env.DOMINIO_FRONTEND_URL,
    process.env.DOMINIO_FRONTEND_URL + '/',
    process.env.API_URL,
    process.env.API_URL + '/',
  ].filter(Boolean) as string[]; // Remove valores nulos/indefinidos

  const corsOptions: cors.CorsOptions = {
    origin: (origin, callback) => {
      // Permite se não houver origin (ex: chamadas internas, testes, ferramentas curl/postman)
      if (!origin) return callback(null, true);

      // Em ambiente de desenvolvimento ou teste, aceita qualquer porta em localhost ou 127.0.0.1
      if (
        process.env.NODE_ENV !== 'production' &&
        /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
      ) {
        return callback(null, true);
      }

      // Verificação normalizada (remove barras finais para comparar)
      const isAllowed = allowedOrigins.some(
        (allowed) => allowed.replace(/\/$/, '') === origin.replace(/\/$/, ''),
      );

      if (isAllowed) {
        callback(null, true);
      } else {
        callback(
          new AppError(
            `Acesso bloqueado por CORS: ${origin} não permitida.`,
            403,
          ),
        );
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'x-requested-with',
      'Accept',
      'Cookie',
    ],
    credentials: true, // Necessário para cookies HTTP-only
    maxAge: 86400,
  };

  // ======================
  // Configurações do Express
  // ======================
  app.set('trust proxy', 1);

  // ======================
  // Middlewares globais
  // ======================
  app.use(helmet());
  app.use(limiter);

  // Aplica o CORS a todas as requisições
  app.use(cors(corsOptions));

  // Limite expandido para suportar uploads de Shapefiles em Base64 e geometrias GeoJSON
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));
  app.use(cookieParser());

  const loggerMiddleware = pinoHttp({
    logger: logger, // <-- Passa a sua instância aqui!
    autoLogging: process.env.NODE_ENV !== 'test', // Desliga logs automáticos de rotas nos testes
  });

  app.use(loggerMiddleware);

  // ======================
  // Healthcheck (CI / Docker / K8s)
  // ======================
  app.get('/api/health', (_, res) => {
    res.status(200).json({ status: 'ok', message: 'Service is healthy' });
  });

  app.get('/api', (_, res) => {
    res.status(200).json({ status: 'ok' });
  });

  // ======================
  // API
  // ======================
  app.use('/api', mainRouter);

  // ======================
  // Configuração do Swagger para documentação automática
  // ======================
  setupSwagger(app);

  // ======================
  // Rate Limiting para rotas de autenticação
  // ======================
  const authLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hora
    max: process.env.NODE_ENV === 'development' ? 100 : 5, // Apenas 5 tentativas de login por hora
    message: 'Muitas tentativas de login. Tente novamente mais tarde.',
  });
  app.use('/api/auth/login', authLimiter);

  // ======================
  // Errors
  // ======================
  app.use(errorMiddleware);

  return app;
}
