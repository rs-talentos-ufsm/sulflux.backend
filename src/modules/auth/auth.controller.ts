import { CookieOptions, NextFunction, Request, Response } from 'express';
import { AuthService } from './auth.service.js';
import {
  createUserSchema,
  LoginAuthDTO,
  loginSchema,
  UserResponseDTO,
  userIdSchema,
} from '@lib/shared';

const ACCESS_COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: 'none',
  path: '/',
  maxAge: 1000 * 60 * 15, // 15 minutes
};

const REFRESH_COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: 'none',
  path: '/',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 Dias
};

export class AuthController {
  private authService = new AuthService();

  public login = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const validation = loginSchema.safeParse(req.body);

      if (!validation.success) {
        res.status(400).json({
          type: '/errors/validation-error',
          title: 'Dados de login inválidos.',
          status: 400,
          errors: validation.error.flatten().fieldErrors,
        });
        return;
      }

      const { email, password }: LoginAuthDTO = validation.data;

      const { accessToken, refreshToken, user } = await this.authService.login({
        email,
        password,
      });

      res.cookie('accessToken', accessToken, ACCESS_COOKIE_OPTIONS);
      res.cookie('refreshToken', refreshToken, REFRESH_COOKIE_OPTIONS);

      // Retorna no formato esperado pelo loginResponseSchema
      res.status(200).json(user);
    } catch (error) {
      next(error);
    }
  };

  public refreshToken = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const token = req.cookies.refreshToken;

      if (!token) {
        res.status(401).json({
          type: '/errors/unauthorized',
          title: 'Token de atualização ausente.',
          status: 401,
        });
        return;
      }

      const result = await this.authService.refreshToken(token);

      res.cookie('accessToken', result.accessToken, ACCESS_COOKIE_OPTIONS);

      // Retorna o novo accessToken conforme mapeado nas rotas
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  public register = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const validation = createUserSchema.safeParse(req.body);

      if (!validation.success) {
        res.status(400).json({
          type: '/errors/validation-error',
          title: 'Erro de validação nos dados enviados.',
          status: 400,
          errors: validation.error.flatten().fieldErrors,
        });
        return;
      }

      // Recusa o registro de novos usuários, apenas permite para emails listados
      const allowedEmails =
        process.env.ALLOWED_REGISTER_EMAILS?.split(',').map((email) =>
          email.trim().toLowerCase(),
        ) ?? [];

      console.log('Emails permitidos para registro:', allowedEmails);

      if (!allowedEmails.includes(validation.data.email.toLowerCase())) {
        res.status(403).json({
          type: '/errors/forbidden',
          title: 'Registro não permitido.',
          status: 403,
          detail: 'Registro de novos usuários não está habilitado no momento.',
        });
        return;
      }

      const newUser: UserResponseDTO = await this.authService.register(
        validation.data,
      );

      // Retorno direto
      res.status(201).json(newUser);
    } catch (error: unknown) {
      next(error);
    }
  };

  public findById = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const validation = userIdSchema.safeParse(req.params);

      if (!validation.success) {
        res.status(400).json({
          type: '/errors/validation-error',
          title: 'ID inválido.',
          status: 400,
          errors: validation.error.flatten().fieldErrors,
        });
        return;
      }

      const { id } = validation.data;
      const user: UserResponseDTO = await this.authService.getMe(id);

      res.status(200).json(user);
    } catch (error: unknown) {
      next(error);
    }
  };

  public logout = (req: Request, res: Response, next: NextFunction): void => {
    try {
      res.clearCookie('accessToken', { ...ACCESS_COOKIE_OPTIONS, maxAge: 0 });
      res.clearCookie('refreshToken', { ...REFRESH_COOKIE_OPTIONS, maxAge: 0 });

      // Padrão REST moderno: 204 sem corpo
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  public getMe = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          type: '/errors/unauthorized',
          title: 'Usuário não identificado.',
          status: 401,
          detail:
            'Não foi possível encontrar as credenciais do usuário na requisição.',
        });
        return;
      }

      // Validação do ID do usuário autenticado
      const validation = userIdSchema.safeParse({ id: userId });

      if (!validation.success) {
        res.status(400).json({
          type: '/errors/validation-error',
          title: 'ID de sessão inválido.',
          status: 400,
          errors: validation.error.flatten().fieldErrors,
        });
        return;
      }

      const { id } = validation.data;
      const user: UserResponseDTO = await this.authService.getMe(id);

      res.status(200).json(user);
    } catch (error: unknown) {
      next(error);
    }
  };
}
