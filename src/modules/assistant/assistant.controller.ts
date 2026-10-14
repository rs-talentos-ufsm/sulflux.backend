import { Request, Response, NextFunction } from 'express';
import { AssistantService } from './assistant.service';
import { assistantChatRequestSchema } from '@lib/shared';
import { AppError } from '../../utils/AppError';

export class AssistantController {
  private service: AssistantService;

  constructor() {
    this.service = new AssistantService();
  }

  public getContext = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const userId = (req as any).user?.id;
      const result = await this.service.getContext(userId);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  public getMessages = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const userId = (req as any).user?.id;
      const result = await this.service.getMessages(userId);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  public clearMessages = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const userId = (req as any).user?.id;
      const result = await this.service.clearMessages(userId);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  public sendMessage = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const userId = (req as any).user?.id;
      const validation = assistantChatRequestSchema.safeParse(req.body);

      if (!validation.success) {
        throw new AppError(
          'Mensagem inválida.',
          400,
          validation.error.flatten().fieldErrors,
        );
      }

      const result = await this.service.sendMessage(
        validation.data.message,
        userId,
      );

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };
}
