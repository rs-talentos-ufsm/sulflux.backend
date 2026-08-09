import { Router } from 'express';
import userRoutes from '@/modules/user/user.routes.js';
import authRoutes from '@/modules/auth/auth.routes.js';
import taskRoutes from '@/modules/task/task.routes.js';
import projectRoutes from '@/modules/project/project.routes';
import timeLogRoutes from '@/modules/time-log/time-log.routes';
import dashboardRoutes from '@/modules/dashboard/dashboard.routes';

const mainRouter = Router();

// Models
mainRouter.use('/users', userRoutes);
mainRouter.use('/auth', authRoutes);
mainRouter.use('/tasks', taskRoutes);
mainRouter.use('/time-logs', timeLogRoutes);
mainRouter.use('/projects', projectRoutes);
mainRouter.use('/dashboard', dashboardRoutes);

export default mainRouter;
