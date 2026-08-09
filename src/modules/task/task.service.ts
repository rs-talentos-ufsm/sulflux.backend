import { prisma } from '../../infra/database.js';
import { AppError } from '../../utils/AppError.js';
import {
  CreateTaskDTO,
  UpdateTaskDTO,
  TaskResponseDTO,
  PaginatedTasksDTO,
  TaskStatus,
  TaskRole,
} from '@lib/shared';
import { TimeLogService } from '../time-log/time-log.service.js';

export class TaskService {
  /**
   * Creates a new task.
   * @param taskData - DTO with the new task's data.
   * @param userId - The ID of the user creating the task.
   * @throws AppError if the task cannot be created.
   * @returns The created task object.
   */
  public async create(
    taskData: CreateTaskDTO,
    ownerId: string,
  ): Promise<TaskResponseDTO> {
    try {
      const normalizedData = {
        title: taskData.title,
        description:
          taskData.description?.trim() === ''
            ? undefined
            : taskData.description,
        dueDate: taskData.dueDate ? new Date(taskData.dueDate) : undefined,
        projectId: taskData.projectId,
        priority: taskData.priority
          ? (taskData.priority.toUpperCase() as any)
          : undefined,
        status: TaskStatus.Backlog, // Set the default status to "Backlog"
        ownerId: ownerId,
        members: {
          create: [
            // Add owner as a member of the task
            {
              userId: ownerId,
              role: TaskRole.Owner,
            },
          ],
        },
      };

      const newTask = await prisma.task.create({
        data: normalizedData,
        include: {
          project: true,
          members: true,
        },
      });

      return newTask as unknown as TaskResponseDTO;
    } catch (error) {
      console.error('Erro ao criar tarefa: ', error);
      throw new AppError(
        'Não foi possível criar a tarefa devido a um erro interno.',
        500,
      );
    }
  }

  /**
   * Searches for a task by its ID.
   * @param id - The ID of the task to search for.
   * @param userId - The ID of the user searching for the task.
   * @returns Returns the data for the searched task.
   * @throws AppError if the task is not found.
   */
  public async findById(id: string, userId: string): Promise<TaskResponseDTO> {
    try {
      const task = await prisma.task.findFirst({
        where: {
          id,
          OR: [{ ownerId: userId }, { members: { some: { userId: userId } } }],
        },
        include: {
          project: true,
          members: true,
          timeSessions: {
            where: { ...(userId ? { userId } : {}), isConsolidated: false },
          },
        },
      });

      if (!task) {
        throw new AppError('Tarefa não encontrada.', 404);
      }

      const taskWithTimer = {
        ...task,
        isTimerActive: task.timeSessions.some((s: any) => s.endTime === null),
        hasPendingSessions: task.timeSessions.some(
          (s: any) => s.endTime !== null && !s.isConsolidated,
        ),
      };

      return taskWithTimer as unknown as TaskResponseDTO;
    } catch (error) {
      if (error instanceof AppError) throw error;
      console.error('Erro ao buscar tarefa: ', error);
      throw new AppError(
        'Não foi possível buscar a tarefa devido a um erro interno.',
        500,
      );
    }
  }

  /**
   * Searches for tasks with pagination.
   * @param page - The page number to return.
   * @param limit - The number of items per page.
   * @returns An object with the pagination data and the list of tasks.
   * @throws AppError if the tasks cannot be found.
   * @param userId - The ID of the user searching for the tasks.
   */
  public async findAll(
    userId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<PaginatedTasksDTO> {
    try {
      const skip = (page - 1) * limit;

      const accessCondition = {
        OR: [{ ownerId: userId }, { members: { some: { userId: userId } } }],
      };

      const [count, tasks] = await prisma.$transaction([
        prisma.task.count({ where: accessCondition }),
        prisma.task.findMany({
          where: accessCondition,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            project: true,
            members: true,
            timeSessions: {
              where: { userId, isConsolidated: false },
              take: 1,
            },
          },
        }),
      ]);

      // Mapeia adicionando o isTimerActive e garantindo o formato correto
      const tasksWithTimer = tasks.map((task: any) => ({
        ...task,
        isTimerActive: task.timeSessions.some((s: any) => s.endTime === null),
        hasPendingSessions: task.timeSessions.some(
          (s: any) => s.endTime !== null && !s.isConsolidated,
        ),
      }));

      return {
        data: tasksWithTimer as unknown as TaskResponseDTO[],
        meta: {
          totalItems: count,
          totalPages: Math.ceil(count / limit),
          currentPage: page,
          itemsPerPage: limit,
        },
      };
    } catch (error) {
      console.error('Erro ao listar tarefas: ', error);
      throw new AppError(
        'Não foi possível buscar as tarefas devido a um erro interno.',
        500,
      );
    }
  }

  /**
   * Updates an existing task.
   * @param id - task id.
   * @param taskData - DTO with the updated task data.
   * @throws AppError if the task cannot be found.
   * @returns Returns the updated task data.
   */
  public async update(
    id: string,
    userId: string,
    taskData: UpdateTaskDTO,
  ): Promise<TaskResponseDTO> {
    try {
      const taskToUpdate = await prisma.task.findUnique({
        where: { id },
      });

      if (!taskToUpdate) {
        throw new AppError('Tarefa não encontrada.', 404);
      }

      if (taskToUpdate.ownerId !== userId) {
        throw new AppError(
          'Você não tem permissão para atualizar esta tarefa.',
          403,
        );
      }

      const { memberIds, ...data } = taskData;

      const normalizedData: any = {
        title: data.title,
        description:
          data.description?.trim() === '' ? undefined : data.description,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        priority: data.priority ? data.priority.toUpperCase() : undefined,
        status: data.status ? data.status.toUpperCase() : undefined,
        totalMinutes: data.totalMinutes !== 0 ? data.totalMinutes : 0,
      };

      if (data.projectId) {
        normalizedData.project = {
          connect: { id: data.projectId },
        };
      }

      if (memberIds) {
        normalizedData.members = {
          deleteMany: {
            userId: { not: taskToUpdate.ownerId },
          },
          create: memberIds
            .filter((id: string) => id !== taskToUpdate.ownerId)
            .map((memberId: string) => ({
              userId: memberId,
              role: TaskRole.Member,
            })),
        };
      }

      if (data.status === TaskStatus.Completed) {
        const timeLogService = new TimeLogService();
        await timeLogService.deletePendingSessionsByTask(id);
      }

      const updatedTask = await prisma.task.update({
        where: { id },
        data: normalizedData,
        include: { members: true, project: true },
      });

      return updatedTask as unknown as TaskResponseDTO;
    } catch (error) {
      console.error('DETALHE DO ERRO PRISMA:', error);
      if (error instanceof AppError) throw error;
      console.error('Erro ao atualizar tarefa: ', error);
      throw new AppError(
        'Não foi possível atualizar a tarefa devido a um erro interno.',
        500,
      );
    }
  }

  /**
   * Deletes a task.
   * @param id - task id.
   * @param userId - The ID of the user attempting to delete the task.
   * @throws AppError if the task does not exist.
   */
  public async delete(id: string, userId: string): Promise<void> {
    try {
      const taskToDelete = await prisma.task.findUnique({
        where: { id },
      });

      if (!taskToDelete) {
        throw new AppError('Tarefa não encontrada.', 404);
      }

      if (taskToDelete.ownerId !== userId) {
        throw new AppError(
          'Você não tem permissão para deletar esta tarefa.',
          403,
        );
      }

      await prisma.task.delete({
        where: { id },
      });
    } catch (error) {
      if (error instanceof AppError) throw error;
      console.error('Erro ao deletar tarefa: ', error);
      throw new AppError(
        'Não foi possível deletar a tarefa devido a um erro interno.',
        500,
      );
    }
  }
}
