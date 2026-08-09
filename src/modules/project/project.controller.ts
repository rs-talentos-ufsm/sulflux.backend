import { Request, Response, NextFunction } from 'express';
import { ProjectService } from './project.service.js';
import {
  UpdateProjectDTO,
  PaginatedProjectsDTO,
  createProjectSchema,
  projectIdSchema,
  paginationSchema,
  updateProjectSchema,
  ProjectResponseDTO,
} from '@lib/shared';

export class ProjectController {
  private projectService = new ProjectService();

  /**
   * Creates a new project
   */
  public create = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const validation = createProjectSchema.safeParse(req.body);

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
          detail: 'É necessário estar autenticado para acessar esta rota.',
        });
        return;
      }

      const newProject: ProjectResponseDTO = await this.projectService.create(
        validation.data,
        userId,
      );

      res.status(201).json(newProject);
    } catch (error: unknown) {
      next(error);
    }
  };

  /**
   * search the project by id
   */
  public findById = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const validation = projectIdSchema.safeParse(req.params);

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
          detail: 'É necessário estar autenticado para acessar esta rota.',
        });
        return;
      }

      const project: ProjectResponseDTO = await this.projectService.findById(
        id,
        userId,
      );

      res.status(200).json(project);
    } catch (error: unknown) {
      next(error);
    }
  };

  /**
   * search all projects
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
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          type: '/errors/unauthorized',
          title: 'Usuário não autenticado',
          status: 401,
          detail: 'É necessário estar autenticado para acessar esta rota.',
        });
        return;
      }

      const result: PaginatedProjectsDTO = await this.projectService.findAll(
        userId,
        page,
        limit,
      );

      res.status(200).json(result);
    } catch (error: unknown) {
      next(error);
    }
  };

  /**
   * update the project by id
   */
  public update = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const idValidation = projectIdSchema.safeParse(req.params);
      if (!idValidation.success) {
        res.status(400).json({
          type: '/errors/validation-error',
          title: 'ID inválido',
          status: 400,
          errors: idValidation.error.flatten().fieldErrors,
        });
        return;
      }

      const bodyValidation = updateProjectSchema.safeParse(req.body);
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
          detail: 'É necessário estar autenticado para acessar esta rota.',
        });
        return;
      }

      const projectData: UpdateProjectDTO = bodyValidation.data;

      const updatedProject: ProjectResponseDTO =
        await this.projectService.update(id, userId, projectData);

      res.status(200).json(updatedProject);
    } catch (error: unknown) {
      next(error);
    }
  };

  /**
   * delete the project by id
   */
  public delete = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const validation = projectIdSchema.safeParse(req.params);

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
          detail: 'É necessário estar autenticado para acessar esta rota.',
        });
        return;
      }

      await this.projectService.delete(id, userId);

      res.status(204).send();
    } catch (error: unknown) {
      next(error);
    }
  };
}
