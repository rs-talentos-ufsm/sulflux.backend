import { Prisma } from '@prisma/client';
import { prisma } from '../../infra/database.js';
import { AppError } from '../../utils/AppError.js';
import {
  CreateTimeLogDTO,
  UpdateTimeLogDTO,
  TimeLogResponseDTO,
  PaginatedTimeLogsDTO,
  timeStringToMinutes,
} from '@lib/shared';

export class TimeLogService {
  public async toggleTimer(
    taskId: string,
    userId: string,
  ): Promise<{ isTimerActive: boolean }> {
    try {
      const taskExists = await prisma.task.findUnique({
        where: { id: taskId },
      });

      if (!taskExists) {
        throw new AppError('Tarefa não encontrada.', 404);
      }

      const activeSession = await prisma.timeSession.findFirst({
        where: { taskId, userId, endTime: null },
      });

      if (activeSession) {
        await prisma.timeSession.update({
          where: { id: activeSession.id },
          data: { endTime: new Date() },
        });
        return { isTimerActive: false };
      } else {
        await prisma.timeSession.create({
          data: {
            taskId,
            userId,
            startTime: new Date(),
          },
        });
        return { isTimerActive: true };
      }
    } catch (error) {
      if (error instanceof AppError) throw error;
      console.error('Erro ao alternar o cronômetro: ', error);
      throw new AppError(
        'Não foi possível alterar o estado do cronômetro devido a um erro interno.',
        500,
      );
    }
  }

  public async getPendingTime(
    taskId: string,
    userId: string,
  ): Promise<{
    totalMinutes: number;
    firstStart: Date | null;
    lastEnd: Date | null;
  }> {
    try {
      const pendingSessions = await prisma.timeSession.findMany({
        where: { taskId, userId, isConsolidated: false },
        orderBy: { startTime: 'asc' },
      });

      if (pendingSessions.length === 0) {
        return { totalMinutes: 0, firstStart: null, lastEnd: null };
      }

      let totalMs = 0;
      for (const session of pendingSessions) {
        const start = session.startTime.getTime();
        const end = session.endTime ? session.endTime.getTime() : Date.now();
        totalMs += end - start;
      }

      return {
        totalMinutes: Math.round(totalMs / 1000 / 60),
        firstStart: pendingSessions[0].startTime,
        lastEnd:
          pendingSessions[pendingSessions.length - 1].endTime || new Date(),
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      console.error('Erro ao buscar tempo pendente: ', error);
      throw new AppError(
        'Não foi possível buscar o tempo pendente devido a um erro interno.',
        500,
      );
    }
  }

  public async createLog(
    userId: string,
    logData: CreateTimeLogDTO,
  ): Promise<TimeLogResponseDTO> {
    try {
      const startInMinutes = timeStringToMinutes(logData.startTime);
      const endInMinutes = timeStringToMinutes(logData.endTime);

      if (startInMinutes === null || endInMinutes === null) {
        throw new AppError('Formato de horário inválido.', 400);
      }

      const totalMinutes = endInMinutes - startInMinutes;

      if (totalMinutes <= 0) {
        throw new AppError(
          'O horário de fim deve ser posterior ao horário de início.',
          400,
        );
      }

      const result = await prisma.$transaction(async (tx) => {
        const timeLog = await tx.timeLog.create({
          data: {
            taskId: logData.taskId,
            userId: userId,
            date: new Date(logData.date),
            startTime: logData.startTime,
            endTime: logData.endTime,
            loggedMinutes: totalMinutes,
            nature: logData.nature as any,
            description: logData.description,
          },
        });

        await tx.timeSession.updateMany({
          where: { taskId: logData.taskId, userId, isConsolidated: false },
          data: { isConsolidated: true, endTime: new Date() },
        });

        const task = await tx.task.findUnique({
          where: { id: logData.taskId },
        });

        if (task) {
          await tx.task.update({
            where: { id: logData.taskId },
            data: { totalMinutes: (task.totalMinutes || 0) + totalMinutes },
          });
        }

        return timeLog;
      });

      return result as unknown as TimeLogResponseDTO;
    } catch (error) {
      if (error instanceof AppError) throw error;
      console.error('Erro ao registrar horas: ', error);
      throw new AppError(
        'Não foi possível registrar as horas devido a um erro interno.',
        500,
      );
    }
  }

  public async findAll(
    page: number = 1,
    limit: number = 10,
    userId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<PaginatedTimeLogsDTO> {
    try {
      const skip = (page - 1) * limit;

      const where: Prisma.TimeLogWhereInput = {
        userId,
        ...(startDate && endDate
          ? { date: { gte: startDate, lte: endDate } }
          : {}),
      };

      const [count, timeLogs] = await prisma.$transaction([
        prisma.timeLog.count({ where }),
        prisma.timeLog.findMany({
          skip,
          take: limit,
          orderBy: { date: 'desc' },
          where,
          include: {
            task: true,
          },
        }),
      ]);

      return {
        data: timeLogs as unknown as TimeLogResponseDTO[],
        meta: {
          totalItems: count,
          totalPages: Math.ceil(count / limit),
          currentPage: page,
          itemsPerPage: limit,
        },
      };
    } catch (error) {
      console.error('Erro ao listar logs de tempo: ', error);
      throw new AppError(
        'Não foi possível buscar os logs de tempo devido a um erro interno.',
        500,
      );
    }
  }

  public async findById(
    id: string,
    userId: string,
  ): Promise<TimeLogResponseDTO> {
    try {
      const timeLog = await prisma.timeLog.findFirst({
        where: { id, userId },
        include: { task: true },
      });

      if (!timeLog) {
        throw new AppError('Registro de horas não encontrado.', 404);
      }

      return timeLog as unknown as TimeLogResponseDTO;
    } catch (error) {
      if (error instanceof AppError) throw error;
      console.error('Erro ao buscar log de tempo: ', error);
      throw new AppError('Ocorreu um erro interno ao buscar o registro.', 500);
    }
  }

  public async update(
    id: string,
    userId: string,
    data: UpdateTimeLogDTO,
  ): Promise<TimeLogResponseDTO> {
    try {
      const existingLog = await prisma.timeLog.findFirst({
        where: { id, userId },
      });

      if (!existingLog) {
        throw new AppError('Registro de horas não encontrado.', 404);
      }

      let newTotalMinutes = existingLog.loggedMinutes;
      const startTime = data.startTime || existingLog.startTime;
      const endTime = data.endTime || existingLog.endTime;

      if (data.startTime || data.endTime) {
        const startInMinutes = timeStringToMinutes(startTime);
        const endInMinutes = timeStringToMinutes(endTime);

        if (startInMinutes === null || endInMinutes === null) {
          throw new AppError('Formato de horário inválido.', 400);
        }

        newTotalMinutes = endInMinutes - startInMinutes;

        if (newTotalMinutes <= 0) {
          throw new AppError(
            'O horário de fim deve ser posterior ao horário de início.',
            400,
          );
        }
      }

      const result = await prisma.$transaction(async (tx) => {
        // Se o tempo mudou, compensa a diferença na tarefa relacionada
        if (newTotalMinutes !== existingLog.loggedMinutes) {
          const minuteDifference = newTotalMinutes - existingLog.loggedMinutes;

          const task = await tx.task.findUnique({
            where: { id: existingLog.taskId },
          });

          if (task) {
            await tx.task.update({
              where: { id: existingLog.taskId },
              data: {
                totalMinutes: Math.max(
                  0,
                  (task.totalMinutes || 0) + minuteDifference,
                ),
              },
            });
          }
        }

        const updatedLog = await tx.timeLog.update({
          where: { id },
          data: {
            date: data.date ? new Date(data.date) : undefined,
            startTime: data.startTime,
            endTime: data.endTime,
            loggedMinutes: newTotalMinutes,
            nature: data.nature as any,
            description: data.description,
          },
        });

        return updatedLog;
      });

      return result as unknown as TimeLogResponseDTO;
    } catch (error) {
      if (error instanceof AppError) throw error;
      console.error('Erro ao atualizar log de tempo: ', error);
      throw new AppError(
        'Ocorreu um erro interno ao atualizar o registro.',
        500,
      );
    }
  }

  public async delete(id: string, userId: string): Promise<void> {
    try {
      const existingLog = await prisma.timeLog.findFirst({
        where: { id, userId },
      });

      if (!existingLog) {
        throw new AppError('Registro de horas não encontrado.', 404);
      }

      await prisma.$transaction(async (tx) => {
        // Remove os minutos desta entrada do total acumulado da tarefa
        const task = await tx.task.findUnique({
          where: { id: existingLog.taskId },
        });

        if (task) {
          await tx.task.update({
            where: { id: existingLog.taskId },
            data: {
              totalMinutes: Math.max(
                0,
                (task.totalMinutes || 0) - existingLog.loggedMinutes,
              ),
            },
          });
        }

        await tx.timeLog.delete({
          where: { id },
        });
      });
    } catch (error) {
      if (error instanceof AppError) throw error;
      console.error('Erro ao deletar log de tempo: ', error);
      throw new AppError('Ocorreu um erro interno ao excluir o registro.', 500);
    }
  }

  /**
   * Busca a tarefa que está sendo executada agora baseada na sessão ativa.
   */
  public async getActiveTimer(userId: string) {
    try {
      // 1. Busca a sessão ativa (endTime nulo) do usuário
      const activeSession = await prisma.timeSession.findFirst({
        where: {
          userId,
          endTime: null,
          isConsolidated: false,
        },
        include: {
          task: {
            select: {
              id: true,
              title: true,
              projectId: true,
            },
          },
        },
      });

      if (!activeSession || !activeSession.task) {
        return null; // Nenhum timer rodando para este usuário
      }

      // 2. Pega o ID da tarefa encontrada e busca o pendingTime consolidado
      const pendingData = await this.getPendingTime(
        activeSession.task.id,
        userId,
      );

      return {
        taskId: activeSession.task.id,
        taskTitle: activeSession.task.title,
        projectId: activeSession.task.projectId,
        totalPendingMinutes: pendingData.totalMinutes,
        firstStart: pendingData.firstStart,
        lastEnd: pendingData.lastEnd,
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      console.error('Erro ao buscar timer ativo: ', error);
      throw new AppError('Não foi possível buscar o cronômetro ativo.', 500);
    }
  }

  /**
   * Remove permanentemente as sessões de tempo temporárias/pendentes de uma tarefa.
   */
  public async deletePendingSessionsByTask(taskId: string): Promise<void> {
    try {
      // Busca os IDs para usar deleteMany de forma segura (evita conflitos com middlewares globais)
      const pendingSessions = await prisma.timeSession.findMany({
        where: {
          taskId,
          endTime: { not: null },
          isConsolidated: false,
        },
        select: { id: true },
      });

      if (pendingSessions.length === 0) return;

      const sessionIds = pendingSessions.map((s) => s.id);

      await prisma.timeSession.deleteMany({
        where: {
          id: { in: sessionIds },
        },
      });
    } catch (error) {
      console.error('Erro ao limpar sessões pendentes da tarefa:', error);
      throw new AppError(
        'Não foi possível limpar as sessões temporárias.',
        500,
      );
    }
  }
}
