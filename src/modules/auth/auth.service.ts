import { AppError } from '../../utils/AppError.js';
import { prisma, ExtendedPrismaClient } from '../../infra/database.js';
import { PasswordService } from '../../utils/password.service.js';
import { CreateUserDTO, LoginAuthDTO, UserResponseDTO } from '@lib/shared';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
} from '../../utils/jwt.js';
import { excludePassword } from '../../utils/excludePassword.js';

// Tipagem auxiliar para transações no Prisma
type ExtendedTransactionClient = Parameters<
  Parameters<ExtendedPrismaClient['$transaction']>[0]
>[0];

export class AuthService {
  /**
   * Autentica um usuário e gera os tokens de acesso.
   */
  public async login(loginData: LoginAuthDTO): Promise<{
    accessToken: string;
    refreshToken: string;
    user: UserResponseDTO;
  }> {
    try {
      const { email, password } = loginData;

      let user: any;
      try {
        user = await prisma.user.findUnique({
          where: { email },
        });
      } catch (dbError: any) {
        // Se a coluna role ou o enum UserRole ainda não existirem no PostgreSQL
        if (
          dbError.message?.includes('role') ||
          dbError.message?.includes('UserRole') ||
          dbError.code === 'P2021' ||
          dbError.code === 'P2022'
        ) {
          console.warn(
            '⚠️ Detectada inconsistência de schema para role. Aplicando auto-correção...',
          );
          try {
            await (prisma as any).$executeRawUnsafe(`
              DO $$ BEGIN
                CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'PRODUCER', 'INTERMEDIARY', 'VIEWER');
              EXCEPTION
                WHEN duplicate_object THEN null;
              END $$;
              ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "role" "UserRole" NOT NULL DEFAULT 'PRODUCER';
            `);
            user = await prisma.user.findUnique({
              where: { email },
            });
          } catch (recoveryErr) {
            console.error('Falha na recuperação de schema:', recoveryErr);
            throw dbError;
          }
        } else {
          throw dbError;
        }
      }

      if (!user) {
        throw new AppError('Email ou senha inválidos', 401);
      }

      if (!user.isActive) {
        throw new AppError('Usuário inativo. Contate o administrador.', 403);
      }

      const isPasswordValid = await PasswordService.verify(
        user.password,
        password,
      );

      if (!isPasswordValid) {
        throw new AppError('Email ou senha inválidos', 401);
      }

      const accessToken = generateAccessToken(user.id);
      const refreshToken = generateRefreshToken(user.id);

      const safeUser = excludePassword(user) as any;
      if (!safeUser.role) {
        safeUser.role = 'PRODUCER';
      }

      return {
        accessToken,
        refreshToken,
        user: safeUser as UserResponseDTO,
      };
    } catch (error) {
      if (error instanceof AppError) throw error;

      console.error('Erro ao fazer login: ', error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      throw new AppError(`Não foi possível fazer login: ${errorMsg}`, 500);
    }
  }

  /**
   * Registra um novo usuário (geralmente usado em rotas públicas de sign-up).
   */
  public async register(registerData: CreateUserDTO): Promise<UserResponseDTO> {
    try {
      const { password, ...userData } = registerData;

      const newUser = await prisma.$transaction(
        async (tx: ExtendedTransactionClient) => {
          const existingUser = await tx.user.findUnique({
            where: { email: registerData.email },
          });

          if (existingUser) {
            throw new AppError(
              'Já existe um usuário cadastrado com este e-mail.',
              409,
            );
          }

          const hashedPassword = await PasswordService.hash(password);

          return await tx.user.create({
            data: {
              ...userData,
              role: (userData as any).role || 'PRODUCER',
              password: hashedPassword,
              isActive: true,
            },
          });
        },
      );

      const safeUser = excludePassword(newUser) as any;
      if (!safeUser.role) {
        safeUser.role = 'PRODUCER';
      }
      return safeUser as UserResponseDTO;
    } catch (error) {
      if (error instanceof AppError) throw error;

      console.error('Erro ao registrar usuário: ', error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      throw new AppError(
        `Não foi possível registrar o usuário: ${errorMsg}`,
        500,
      );
    }
  }

  /**
   * Renova o token de acesso utilizando o refresh token.
   */
  public async refreshToken(token: string): Promise<{ accessToken: string }> {
    try {
      const userId = verifyToken(token);

      if (!userId) {
        throw new AppError('Token de renovação inválido ou expirado.', 401);
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user || !user.isActive) {
        throw new AppError('Usuário não autorizado.', 401);
      }

      const accessToken = generateAccessToken(user.id);
      return { accessToken };
    } catch (error) {
      if (error instanceof AppError) throw error;

      console.error('Erro ao renovar token: ', error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      throw new AppError(`Não foi possível renovar o token: ${errorMsg}`, 500);
    }
  }

  /**
   * Busca os dados do próprio usuário autenticado.
   */
  public async getMe(userId: string): Promise<UserResponseDTO> {
    try {
      let user: any;
      try {
        user = await prisma.user.findUnique({
          where: { id: userId },
        });
      } catch (dbError: any) {
        if (
          dbError.message?.includes('role') ||
          dbError.message?.includes('UserRole') ||
          dbError.code === 'P2021' ||
          dbError.code === 'P2022'
        ) {
          try {
            await (prisma as any).$executeRawUnsafe(`
              DO $$ BEGIN
                CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'PRODUCER', 'INTERMEDIARY', 'VIEWER');
              EXCEPTION
                WHEN duplicate_object THEN null;
              END $$;
              ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "role" "UserRole" NOT NULL DEFAULT 'PRODUCER';
            `);
            user = await prisma.user.findUnique({
              where: { id: userId },
            });
          } catch {
            throw dbError;
          }
        } else {
          throw dbError;
        }
      }

      if (!user) {
        throw new AppError('Usuário não encontrado.', 404);
      }

      const safeUser = excludePassword(user) as any;
      if (!safeUser.role) {
        safeUser.role = 'PRODUCER';
      }
      return safeUser as UserResponseDTO;
    } catch (error) {
      if (error instanceof AppError) throw error;

      console.error('Erro ao buscar dados do usuário: ', error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      throw new AppError(
        `Não foi possível buscar os dados do usuário: ${errorMsg}`,
        500,
      );
    }
  }
}
