import { Request, Response, NextFunction } from 'express';
import { MonitoringService } from './monitoring.service';

export class MonitoringController {
  private service: MonitoringService;

  constructor() {
    this.service = new MonitoringService();
  }

  public getCarbonAnalysis = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const fieldId = Array.isArray(req.params.fieldId)
        ? req.params.fieldId[0]
        : req.params.fieldId;
      const { safra } = req.query;

      const result = await this.service.getCarbonAnalysis(
        fieldId,
        typeof safra === 'string' ? safra : undefined,
      );

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  public getWaterAnalysis = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const fieldId = Array.isArray(req.params.fieldId)
        ? req.params.fieldId[0]
        : req.params.fieldId;
      const { safra } = req.query;

      const result = await this.service.getWaterAnalysis(
        fieldId,
        typeof safra === 'string' ? safra : undefined,
      );

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  public getPropertyMonitoringHistory = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const propertyId = Array.isArray(req.params.propertyId)
        ? req.params.propertyId[0]
        : req.params.propertyId;
      const result =
        await this.service.getPropertyMonitoringHistory(propertyId);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  public getTalhaoResults = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const fieldId = Array.isArray(req.params.fieldId)
        ? req.params.fieldId[0]
        : req.params.fieldId;
      const result = await this.service.getTalhaoResults(fieldId);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  public getMapExplorerData = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const userId = (req as any).user?.id;
      const result = await this.service.getMapExplorerData(userId);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };
}
