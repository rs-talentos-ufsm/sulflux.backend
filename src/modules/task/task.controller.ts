import { Request, Response, NextFunction } from 'express';
import { TaskService } from './task.service.js';
import {
  UpdateTaskDTO,
  PaginatedTasksDTO,
  createTaskSchema,
  taskIdSchema,
  paginationSchema,
  updateTaskSchema,
  TaskResponseDTO,
} from '@lib/shared';

export class TaskController {
  private taskService = new TaskService();

  /**
   * Creates a new task
   */
  public create = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const validation = createTaskSchema.safeParse(req.body);

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
          detail: 'O usuário precisa estar autenticado para criar uma tarefa.',
        });
        return;
      }

      const newTask: TaskResponseDTO = await this.taskService.create(
        validation.data,
        userId,
      );

      res.status(201).json(newTask);
    } catch (error: unknown) {
      next(error);
    }
  };

  /**
   * search the task by id
   */
  public findById = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const validation = taskIdSchema.safeParse(req.params);

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
          detail: 'O usuário precisa estar autenticado para buscar uma tarefa.',
        });
        return;
      }

      const task: TaskResponseDTO = await this.taskService.findById(id, userId);

      res.status(200).json(task);
    } catch (error: unknown) {
      next(error);
    }
  };

  /**
   * search all tasks
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
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          type: '/errors/unauthorized',
          title: 'Usuário não autenticado',
          status: 401,
          detail: 'O usuário precisa estar autenticado para buscar tarefas.',
        });
        return;
      }

      const { page, limit } = validation.data;
      const result: PaginatedTasksDTO = await this.taskService.findAll(
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
   * update the task by id
   */
  public update = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const idValidation = taskIdSchema.safeParse(req.params);
      if (!idValidation.success) {
        res.status(400).json({
          type: '/errors/validation-error',
          title: 'ID inválido',
          status: 400,
          errors: idValidation.error.flatten().fieldErrors,
        });
        return;
      }

      const bodyValidation = updateTaskSchema.safeParse(req.body);
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
          detail:
            'O usuário precisa estar autenticado para atualizar uma tarefa.',
        });
        return;
      }

      const taskData: UpdateTaskDTO = bodyValidation.data;

      const updatedTask: TaskResponseDTO = await this.taskService.update(
        id,
        userId,
        taskData,
      );

      res.status(200).json(updatedTask);
    } catch (error: unknown) {
      next(error);
    }
  };

  /**
   * delete the task by id
   */
  public delete = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const validation = taskIdSchema.safeParse(req.params);

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
          detail:
            'O usuário precisa estar autenticado para deletar uma tarefa.',
        });
        return;
      }

      await this.taskService.delete(id, userId);

      res.status(204).send();
    } catch (error: unknown) {
      next(error);
    }
  };
}
