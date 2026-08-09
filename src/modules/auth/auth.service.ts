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

      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        throw new AppError('Email ou senha inválidos', 401);
      }

      if (!user.is_active) {
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

      const safeUser = excludePassword(user);

      return {
        accessToken,
        refreshToken,
        user: safeUser as UserResponseDTO,
      };
    } catch (error) {
      if (error instanceof AppError) throw error;

      console.error('Erro ao fazer login: ', error);
      throw new AppError(
        'Não foi possível fazer login devido a um erro interno.',
        500,
      );
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
              password: hashedPassword,
              is_active: true,
            },
          });
        },
      );

      const safeUser = excludePassword(newUser);
      return safeUser as UserResponseDTO;
    } catch (error) {
      if (error instanceof AppError) throw error;

      console.error('Erro ao registrar usuário: ', error);
      throw new AppError(
        'Não foi possível registrar o usuário devido a um erro interno.',
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

      if (!user || !user.is_active) {
        throw new AppError('Usuário não autorizado.', 401);
      }

      const accessToken = generateAccessToken(user.id);
      return { accessToken };
    } catch (error) {
      if (error instanceof AppError) throw error;

      console.error('Erro ao renovar token: ', error);
      throw new AppError(
        'Não foi possível renovar o token devido a um erro interno.',
        500,
      );
    }
  }

  /**
   * Busca os dados do próprio usuário autenticado.
   */
  public async getMe(userId: string): Promise<UserResponseDTO> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new AppError('Usuário não encontrado.', 404);
      }

      const safeUser = excludePassword(user);
      return safeUser as UserResponseDTO;
    } catch (error) {
      if (error instanceof AppError) throw error;

      console.error('Erro ao buscar dados do usuário: ', error);
      throw new AppError(
        'Não foi possível buscar os dados do usuário devido a um erro interno.',
        500,
      );
    }
  }
}
