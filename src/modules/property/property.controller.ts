import { Request, Response, NextFunction } from 'express';
import { PropertyService } from './property.service';
import {
  UpdatePropertyDTO,
  PaginatedPropertiesDTO,
  createPropertySchema,
  propertyIdSchema,
  propertyQuerySchema,
  updatePropertySchema,
  PropertyResponseDTO,
} from '@lib/shared';

export class PropertyController {
  private propertyService = new PropertyService();

  public create = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const validation = createPropertySchema.safeParse(req.body);

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
          detail:
            'O usuário precisa estar autenticado para criar uma propriedade.',
        });
        return;
      }

      const newProperty: PropertyResponseDTO =
        await this.propertyService.create(validation.data, userId);

      res.status(201).json(newProperty);
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
      const validation = propertyIdSchema.safeParse(req.params);

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

      const property: PropertyResponseDTO = await this.propertyService.findById(
        id,
        userId,
      );

      res.status(200).json(property);
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
      const validation = propertyQuerySchema.safeParse(req.query);

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

      const result: PaginatedPropertiesDTO = await this.propertyService.findAll(
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
      const idValidation = propertyIdSchema.safeParse(req.params);
      if (!idValidation.success) {
        res.status(400).json({
          type: '/errors/validation-error',
          title: 'ID inválido',
          status: 400,
          errors: idValidation.error.flatten().fieldErrors,
        });
        return;
      }

      const bodyValidation = updatePropertySchema.safeParse(req.body);
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

      const propertyData: UpdatePropertyDTO = bodyValidation.data;
      const updatedProperty: PropertyResponseDTO =
        await this.propertyService.update(id, userId, propertyData);

      res.status(200).json(updatedProperty);
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
      const validation = propertyIdSchema.safeParse(req.params);

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

      await this.propertyService.delete(id, userId);

      res.status(204).send();
    } catch (error: unknown) {
      next(error);
    }
  };
}
