import { prisma } from '../../infra/database';
import { AppError } from '../../utils/AppError';
import {
  CreateDocumentDTO,
  DocumentResponseDTO,
  DocumentFolderDTO,
  DocumentType,
} from '@lib/shared';

export class DocumentService {
  /**
   * Lista documentos do usuário com filtros opcionais
   */
  public async list(
    userId: string,
    query?: string,
    folder?: string,
  ): Promise<DocumentResponseDTO[]> {
    const where: any = { userId };

    if (folder && folder !== 'Todos') {
      where.folder = folder;
    }

    if (query) {
      where.name = { contains: query, mode: 'insensitive' };
    }

    let docs = await prisma.farmDocument.findMany({
      where,
      include: { user: true },
      orderBy: { createdAt: 'desc' },
    });

    // Se o usuário ainda não tiver documentos, semeamos documentos essenciais de amostra
    if (docs.length === 0 && !query && (!folder || folder === 'Todos')) {
      const initialDocs = [
        {
          name: 'Certificacao-Carbono-Safra23-24.pdf',
          type: DocumentType.Pdf,
          size: '2.4 MB',
          folder: 'Certificações',
        },
        {
          name: 'Laudo-EddyCovariance-Torre1.pdf',
          type: DocumentType.Pdf,
          size: '1.8 MB',
          folder: 'Laudos Técnicos',
        },
        {
          name: 'Cadastro-Ambiental-Rural-SICAR.pdf',
          type: DocumentType.Pdf,
          size: '4.2 MB',
          folder: 'CAR & Regularização',
        },
        {
          name: 'Balanco-Hidrico-Solo-LaNina.xlsx',
          type: DocumentType.Spreadsheet,
          size: '890 KB',
          folder: 'Planilhas & Dados',
        },
        {
          name: 'Mapeamento-Sentinel2A-NDVI.png',
          type: DocumentType.Image,
          size: '3.1 MB',
          folder: 'Sensoriamento Remoto',
        },
      ];

      for (const d of initialDocs) {
        await prisma.farmDocument.create({
          data: {
            userId,
            name: d.name,
            type: d.type,
            size: d.size,
            folder: d.folder,
            fileUrl: `/uploads/${d.name}`,
          },
        });
      }

      docs = await prisma.farmDocument.findMany({
        where,
        include: { user: true },
        orderBy: { createdAt: 'desc' },
      });
    }

    return docs.map((d) => ({
      id: d.id,
      name: d.name,
      type: d.type as any,
      size: d.size,
      folder: d.folder,
      fileUrl: d.fileUrl,
      propertyId: d.propertyId,
      userId: d.userId,
      userName: d.user?.name,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
    }));
  }

  /**
   * Resumo de pastas de documentos
   */
  public async getFolders(userId: string): Promise<DocumentFolderDTO[]> {
    const docs = await this.list(userId);

    const folderMap = new Map<string, number>();
    for (const doc of docs) {
      folderMap.set(doc.folder, (folderMap.get(doc.folder) || 0) + 1);
    }

    const defaultThemes: Record<string, string> = {
      Certificações: 'emerald',
      'Laudos Técnicos': 'blue',
      'CAR & Regularização': 'amber',
      'Planilhas & Dados': 'pink',
      'Sensoriamento Remoto': 'violet',
      Geral: 'red',
    };

    return Array.from(folderMap.entries()).map(([name, files]) => ({
      name,
      files,
      theme: defaultThemes[name] || 'blue',
    }));
  }

  /**
   * Registra um novo documento
   */
  public async create(
    data: CreateDocumentDTO,
    userId: string,
  ): Promise<DocumentResponseDTO> {
    const doc = await prisma.farmDocument.create({
      data: {
        userId,
        name: data.name,
        type: data.type,
        size: data.size,
        folder: data.folder,
        fileUrl: data.fileUrl ?? `/uploads/${data.name}`,
        propertyId: data.propertyId,
      },
      include: { user: true },
    });

    return {
      id: doc.id,
      name: doc.name,
      type: doc.type as any,
      size: doc.size,
      folder: doc.folder,
      fileUrl: doc.fileUrl,
      propertyId: doc.propertyId,
      userId: doc.userId,
      userName: doc.user?.name,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }

  /**
   * Exclui um documento
   */
  public async delete(id: string, userId: string): Promise<void> {
    const doc = await prisma.farmDocument.findFirst({
      where: { id, userId },
    });

    if (!doc) {
      throw new AppError('Documento não encontrado.', 404);
    }

    await prisma.farmDocument.delete({
      where: { id },
    });
  }
}
