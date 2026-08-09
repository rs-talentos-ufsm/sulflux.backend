import { Request, Response, NextFunction } from 'express';
import { UserService } from './user.service.js';
import {
  UpdateUserDTO,
  UserResponseDTO,
  PaginatedUsersDTO,
  createUserSchema,
  userIdSchema,
  paginationSchema,
  updateUserSchema,
} from '@lib/shared';

export class UserController {
  private userService = new UserService();

  /**
   * Creates a new user
   */
  public create = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const validation = createUserSchema.safeParse(req.body);

      if (!validation.success) {
        res.status(400).json({
          type: '/errors/validation-error',
          title: 'Erro de validação nos dados enviados',
          status: 400,
          detail: 'Um ou mais campos falharam na validação.',
          errors: validation.error.flatten().fieldErrors,
        });
        return;
      }

      const newUser: UserResponseDTO = await this.userService.create(
        validation.data,
      );

      res.status(201).json(newUser);
    } catch (error: unknown) {
      next(error);
    }
  };

  /**
   * search the user by id
   */
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
          title: 'ID inválido',
          status: 400,
          errors: validation.error.flatten().fieldErrors,
        });
        return;
      }

      const { id } = validation.data;
      const user: UserResponseDTO = await this.userService.findById(id);

      res.status(200).json(user);
    } catch (error: unknown) {
      next(error);
    }
  };

  /**
   * search all users
   */
  public findAll = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const validation = paginationSchema.safeParse(req.query);

      if (!validation.success) {
        res.status(400).json({
          type: '/errors/validation-error',
          title: 'Parâmetros de paginação inválidos',
          status: 400,
          errors: validation.error.flatten().fieldErrors,
        });
        return;
      }

      const { page, limit } = validation.data;
      const result: PaginatedUsersDTO = await this.userService.findAll(
        page,
        limit,
      );

      // Removido o { success: true }
      res.status(200).json(result);
    } catch (error: unknown) {
      next(error);
    }
  };

  /**
   * update the user by id
   */
  public update = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const idValidation = userIdSchema.safeParse(req.params);
      if (!idValidation.success) {
        res.status(400).json({
          type: '/errors/validation-error',
          title: 'ID inválido',
          status: 400,
          errors: idValidation.error.flatten().fieldErrors,
        });
        return;
      }

      const bodyValidation = updateUserSchema.safeParse(req.body);
      if (!bodyValidation.success) {
        res.status(400).json({
          type: '/errors/validation-error',
          title: 'Erro de validação nos dados enviados',
          status: 400,
          errors: bodyValidation.error.flatten().fieldErrors,
        });
        return;
      }

      const { id } = idValidation.data;
      const userData: UpdateUserDTO = bodyValidation.data;

      const updatedUser: UserResponseDTO = await this.userService.update(
        id,
        userData,
      );
      res.status(200).json(updatedUser);
    } catch (error: unknown) {
      next(error);
    }
  };

  /**
   * delete the user by id
   */
  public delete = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const validation = userIdSchema.safeParse(req.params);

      if (!validation.success) {
        res.status(400).json({
          type: '/errors/validation-error',
          title: 'ID inválido',
          status: 400,
          errors: validation.error.flatten().fieldErrors,
        });
        return;
      }

      const { id } = validation.data;

      await this.userService.delete(id);

      res.status(204).send();
    } catch (error: unknown) {
      next(error);
    }
  };
}
