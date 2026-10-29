import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError.js';

export const errorMiddleware = (
  error: any,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  console.error('❌ Erro capturado no servidor:', error);

  // Erros conhecidos da aplicação (AppError)
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      type: `/errors/${error.statusCode}`,
      title: error.message,
      status: error.statusCode,
      detail: error.message,
      errors: error.details || undefined,
      success: false,
    });
  }

  // Erro de limite de tamanho de payload (ex: upload grande)
  if (error.type === 'entity.too.large' || error.status === 413) {
    return res.status(413).json({
      type: '/errors/payload-too-large',
      title: 'Tamanho da requisição excedido',
      status: 413,
      detail:
        'O arquivo ou dados enviados excedem o limite suportado pelo servidor.',
      success: false,
    });
  }

  // Erro de sintaxe JSON
  if (error instanceof SyntaxError && 'body' in error) {
    return res.status(400).json({
      type: '/errors/invalid-json',
      title: 'Corpo da requisição JSON inválido',
      status: 400,
      detail: error.message,
      success: false,
    });
  }

  // Erros de Prisma / Banco de Dados
  if (error.name === 'PrismaClientKnownRequestError') {
    return res.status(500).json({
      type: '/errors/database-error',
      title: 'Erro na operação com banco de dados',
      status: 500,
      detail: `Prisma error (${error.code}): ${error.message}`,
      success: false,
    });
  }

  if (error.name === 'PrismaClientInitializationError') {
    return res.status(500).json({
      type: '/errors/database-connection',
      title: 'Falha de conexão com o banco de dados',
      status: 500,
      detail:
        'Não foi possível conectar ao banco de dados PostgreSQL. Verifique se o container está ativo.',
      success: false,
    });
  }

  // Status HTTP nativo se fornecido (ex: CORS, middlewares de terceiros)
  const statusCode = error.status || error.statusCode || 500;
  const message = error.message || 'Internal server error.';

  return res.status(statusCode).json({
    type: `/errors/${statusCode}`,
    title: statusCode === 500 ? 'Erro interno no servidor' : message,
    status: statusCode,
    detail: message,
    success: false,
  });
};
