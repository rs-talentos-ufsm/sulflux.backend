import { Router } from 'express';
import userRoutes from '@/modules/user/user.routes';
import authRoutes from '@/modules/auth/auth.routes';
import propertyRoutes from '@/modules/property/property.routes';
import fieldRoutes from '@/modules/field/field.routes';

const mainRouter = Router();

// Models
mainRouter.use('/users', userRoutes);
mainRouter.use('/auth', authRoutes);
mainRouter.use('/properties', propertyRoutes);
mainRouter.use('/fields', fieldRoutes);

export default mainRouter;
