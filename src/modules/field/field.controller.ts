import { Request, Response, NextFunction } from 'express';
import { FieldService } from './field.service';
import {
  UpdateFieldDTO,
  PaginatedFieldsDTO,
  createFieldSchema,
  fieldIdSchema,
  fieldQuerySchema,
  updateFieldSchema,
  FieldResponseDTO,
} from '@lib/shared';

export class FieldController {
  private fieldService = new FieldService();

  public create = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const validation = createFieldSchema.safeParse(req.body);

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

      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          type: '/errors/unauthorized',
          title: 'Usuário não autenticado',
          status: 401,
          detail: 'O usuário precisa estar autenticado para criar um talhão.',
        });
        return;
      }

      const newField: FieldResponseDTO = await this.fieldService.create(
        validation.data,
        userId,
      );

      res.status(201).json(newField);
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
      const validation = fieldIdSchema.safeParse(req.params);

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
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          type: '/errors/unauthorized',
          title: 'Usuário não autenticado',
          status: 401,
        });
        return;
      }

      const field: FieldResponseDTO = await this.fieldService.findById(
        id,
        userId,
      );

      res.status(200).json(field);
    } catch (error: unknown) {
      next(error);
    }
  };

  public findAll = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const validation = fieldQuerySchema.safeParse(req.query);

      if (!validation.success) {
        res.status(400).json({
          type: '/errors/validation-error',
          title: 'Parâmetros de busca inválidos',
          status: 400,
          errors: validation.error.flatten().fieldErrors,
        });
        return;
      }

      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          type: '/errors/unauthorized',
          title: 'Usuário não autenticado',
          status: 401,
        });
        return;
      }

      const result: PaginatedFieldsDTO = await this.fieldService.findAll(
        userId,
        validation.data,
      );

      res.status(200).json(result);
    } catch (error: unknown) {
      next(error);
    }
  };

  public update = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const idValidation = fieldIdSchema.safeParse(req.params);
      if (!idValidation.success) {
        res.status(400).json({
          type: '/errors/validation-error',
          title: 'ID inválido',
          status: 400,
          errors: idValidation.error.flatten().fieldErrors,
        });
        return;
      }

      const bodyValidation = updateFieldSchema.safeParse(req.body);
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
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          type: '/errors/unauthorized',
          title: 'Usuário não autenticado',
          status: 401,
        });
        return;
      }

      const fieldData: UpdateFieldDTO = bodyValidation.data;
      const updatedField: FieldResponseDTO = await this.fieldService.update(
        id,
        userId,
        fieldData,
      );

      res.status(200).json(updatedField);
    } catch (error: unknown) {
      next(error);
    }
  };

  public delete = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const validation = fieldIdSchema.safeParse(req.params);

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
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          type: '/errors/unauthorized',
          title: 'Usuário não autenticado',
          status: 401,
        });
        return;
      }

      await this.fieldService.delete(id, userId);

      res.status(204).send();
    } catch (error: unknown) {
      next(error);
    }
  };
}
