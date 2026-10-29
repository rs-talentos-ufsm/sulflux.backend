import { Router } from 'express';
import userRoutes from '@/modules/user/user.routes';
import authRoutes from '@/modules/auth/auth.routes';
import propertyRoutes from '@/modules/property/property.routes';
import fieldRoutes from '@/modules/field/field.routes';
import monitoringRoutes from '@/modules/monitoring/monitoring.routes';
import cycleRoutes from '@/modules/cycle/cycle.routes';
import documentRoutes from '@/modules/documents/document.routes';
import assistantRoutes from '@/modules/assistant/assistant.routes';
import adminRoutes from '@/modules/admin/admin.routes';
import gisRoutes from '@/modules/gis/gis.routes';

const mainRouter = Router();

// Modulos
mainRouter.use('/users', userRoutes);
mainRouter.use('/auth', authRoutes);
mainRouter.use('/properties', propertyRoutes);
mainRouter.use('/fields', fieldRoutes);
mainRouter.use('/monitoring', monitoringRoutes);
mainRouter.use('/cycles', cycleRoutes);
mainRouter.use('/documents', documentRoutes);
mainRouter.use('/assistant', assistantRoutes);
mainRouter.use('/admin', adminRoutes);
mainRouter.use('/gis', gisRoutes);

export default mainRouter;
