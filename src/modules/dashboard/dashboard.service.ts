import { prisma } from '../../infra/database.js';
import { AppError } from '../../utils/AppError.js';
import { DashboardResponseDTO, TaskPriority, TaskStatus } from '@lib/shared';

export class DashboardService {
  public async getSummary(userId: string): Promise<DashboardResponseDTO> {
    try {
      const now = new Date();
      const startOfToday = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
      );

      const userAccessCondition = {
        OR: [{ ownerId: userId }, { members: { some: { userId } } }],
      };

      const [
        totalTasks,
        completedTasks,
        delayedTasks,
        urgentTasks,
        totalProjects,
        totalTimeAggregate,
        todayTimeAggregate,
        natureGroups,
        projectsWithTimeLogs,
        recentLogs,
      ] = await Promise.all([
        prisma.task.count({ where: userAccessCondition }),
        prisma.task.count({
          where: { ...userAccessCondition, status: TaskStatus.Completed },
        }),
        prisma.task.count({
          where: {
            ...userAccessCondition,
            dueDate: { lt: now },
            status: { notIn: [TaskStatus.Completed, TaskStatus.Archived] },
          },
        }),
        prisma.task.count({
          where: { ...userAccessCondition, priority: TaskPriority.Urgent },
        }),
        prisma.project.count({ where: userAccessCondition }),
        prisma.timeLog.aggregate({
          where: { userId },
          _sum: { loggedMinutes: true },
        }),
        prisma.timeLog.aggregate({
          where: { userId, date: { gte: startOfToday } },
          _sum: { loggedMinutes: true },
        }),
        prisma.timeLog.groupBy({
          by: ['nature'],
          where: { userId },
          _sum: { loggedMinutes: true },
        }),

        prisma.project.findMany({
          where: userAccessCondition,
          select: {
            name: true,
            tasks: {
              select: {
                timeLogs: {
                  where: { userId },
                  select: { loggedMinutes: true },
                },
              },
            },
          },
        }),

        prisma.timeLog.findMany({
          where: { task: { project: userAccessCondition } },
          include: {
            user: { select: { name: true } },
            task: { select: { title: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 8,
        }),
      ]);

      const totalMinutes = totalTimeAggregate._sum.loggedMinutes || 0;
      const todayMinutes = todayTimeAggregate._sum.loggedMinutes || 0;
      const dailyGoalPercent = Math.min(
        Math.round((todayMinutes / 480) * 100),
        100,
      );

      const hoursPerNature = natureGroups
        .map((group) => ({
          natureza: group.nature,
          horas: Math.round((group._sum.loggedMinutes || 0) / 60),
        }))
        .filter((item) => item.horas > 0);

      const appointmentsPerProject = projectsWithTimeLogs
        .map((project) => {
          const projectMinutes = project.tasks.reduce((acc, task) => {
            return (
              acc +
              task.timeLogs.reduce(
                (accLog, log) => accLog + log.loggedMinutes,
                0,
              )
            );
          }, 0);
          return {
            projeto: project.name,
            horas: Math.round(projectMinutes / 60),
          };
        })
        .filter((p) => p.horas > 0)
        .sort((a, b) => b.horas - a.horas)
        .slice(0, 6);

      const recentActivity = recentLogs.map((log) => ({
        type: 'time_log',
        userName: log.user.name.split(' ')[0],
        taskTitle: log.task.title,
        loggedMinutes: log.loggedMinutes,
        createdAt: log.createdAt.toISOString(),
      }));

      return {
        kpis: {
          totalTasks,
          totalHours: Math.round(totalMinutes / 60),
          completedTasks,
          delayedTasks,
          dailyGoalPercent,
          totalProjects,
          urgentTasks,
          todayMinutes,
        },
        hoursPerNature,
        appointmentsPerProject,
        recentActivity,
      };
    } catch (error) {
      console.error('Erro ao buscar dados do dashboard: ', error);
      throw new AppError(
        'Não foi possível carregar os dados do dashboard.',
        500,
      );
    }
  }
}
