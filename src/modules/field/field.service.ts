import { prisma } from '../../infra/database';
import { AppError } from '../../utils/AppError';
import * as turf from '@turf/turf';
import {
  CreateFieldDTO,
  UpdateFieldDTO,
  FieldResponseDTO,
  PaginatedFieldsDTO,
  FieldStatus,
  FieldQueryDTO,
} from '@lib/shared';

export class FieldService {
  /**
   * Cria um novo talhão validando a posse da propriedade
   */
  public async create(
    data: CreateFieldDTO,
    userId: string,
  ): Promise<FieldResponseDTO> {
    try {
      // Verifica se a propriedade pertence ao usuário
      const property = await prisma.property.findFirst({
        where: { id: data.propertyId, ownerId: userId },
      });

      if (!property) {
        throw new AppError(
          'Propriedade não encontrada ou permissão negada.',
          404,
        );
      }

      // Gera o código do talhão (Ex: TAL-001)
      const fieldsCount = await prisma.field.count({
        where: { propertyId: data.propertyId },
      });
      const nextSequence = String(fieldsCount + 1).padStart(3, '0');
      const generatedCode = `TAL-${nextSequence}`;

      // Extração e formatação de coordenadas para GeoJSON (Turf.js usa [longitude, latitude])
      const coordinates = data.coordinates.map((coord: any) => [
        coord.x,
        coord.y,
      ]);

      const firstPoint = coordinates[0];
      const lastPoint = coordinates[coordinates.length - 1];

      // Se o polígono não estiver fechado, nós fechamos automaticamente
      if (firstPoint[0] !== lastPoint[0] || firstPoint[1] !== lastPoint[1]) {
        coordinates.push(firstPoint);
      }

      const polygon = turf.polygon([coordinates]);

      // Cálculos Automáticos Oficiais do Servidor
      // area() retorna metros quadrados. Dividimos por 10.000 para converter para Hectares.
      const calculatedArea = turf.area(polygon) / 10000;

      // length() calcula o perímetro. Podemos pedir diretamente em kilômetros.
      const calculatedPerimeter = turf.length(polygon, { units: 'kilometers' });

      const newField = await prisma.field.create({
        data: {
          name: data.name,
          code: generatedCode,
          soilType: data.soilType,
          propertyId: data.propertyId,
          status: FieldStatus.Waiting,
          coordinates: data.coordinates as any,
          area: Number(calculatedArea.toFixed(4)),
          perimeter: Number(calculatedPerimeter.toFixed(4)),
        },
      });

      return newField as unknown as FieldResponseDTO;
    } catch (error) {
      if (error instanceof AppError) throw error;
      console.error('Erro ao criar talhão: ', error);
      throw new AppError(
        'Não foi possível criar o talhão devido a um erro interno.',
        500,
      );
    }
  }

  /**
   * Busca todos os talhões do usuário com paginação e filtros
   */
  public async findAll(
    userId: string,
    filters: FieldQueryDTO,
  ): Promise<PaginatedFieldsDTO> {
    try {
      const { page = 1, limit = 10, query, status, propertyId } = filters;
      const skip = (page - 1) * limit;

      // O talhão precisa pertencer a uma propriedade do usuário logado
      const whereCondition: any = {
        property: { ownerId: userId },
      };

      if (propertyId) {
        whereCondition.propertyId = propertyId;
      }

      if (status) {
        whereCondition.status = status;
      }

      if (query) {
        whereCondition.OR = [
          { name: { contains: query, mode: 'insensitive' } },
          { code: { contains: query, mode: 'insensitive' } },
        ];
      }

      const [count, fields] = await prisma.$transaction([
        prisma.field.count({ where: whereCondition }),
        prisma.field.findMany({
          where: whereCondition,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
      ]);

      return {
        data: fields as unknown as FieldResponseDTO[],
        meta: {
          totalItems: count,
          totalPages: Math.ceil(count / limit),
          currentPage: page,
          itemsPerPage: limit,
        },
      };
    } catch (error) {
      console.error('Erro ao listar talhões: ', error);
      throw new AppError(
        'Não foi possível buscar os talhões devido a um erro interno.',
        500,
      );
    }
  }

  /**
   * Busca um talhão específico pelo ID
   */
  public async findById(id: string, userId: string): Promise<FieldResponseDTO> {
    try {
      const field = await prisma.field.findFirst({
        where: {
          id,
          property: { ownerId: userId },
        },
        include: {
          property: true,
        },
      });

      if (!field) {
        throw new AppError('Talhão não encontrado.', 404);
      }

      return field as unknown as FieldResponseDTO;
    } catch (error) {
      if (error instanceof AppError) throw error;
      console.error('Erro ao buscar talhão: ', error);
      throw new AppError(
        'Não foi possível buscar o talhão devido a um erro interno.',
        500,
      );
    }
  }

  /**
   * Atualiza um talhão existente
   */
  public async update(
    id: string,
    userId: string,
    data: UpdateFieldDTO,
  ): Promise<FieldResponseDTO> {
    try {
      const fieldToUpdate = await prisma.field.findUnique({
        where: { id },
        include: { property: true },
      });

      if (!fieldToUpdate) {
        throw new AppError('Talhão não encontrado.', 404);
      }

      if (fieldToUpdate.property.ownerId !== userId) {
        throw new AppError(
          'Você não tem permissão para atualizar este talhão.',
          403,
        );
      }

      const updatedField = await prisma.field.update({
        where: { id },
        data: {
          ...data,
          coordinates: data.coordinates ? (data.coordinates as any) : undefined,
        },
      });

      return updatedField as unknown as FieldResponseDTO;
    } catch (error) {
      if (error instanceof AppError) throw error;
      console.error('Erro ao atualizar talhão: ', error);
      throw new AppError(
        'Não foi possível atualizar o talhão devido a um erro interno.',
        500,
      );
    }
  }

  /**
   * Deleta um talhão
   */
  public async delete(id: string, userId: string): Promise<void> {
    try {
      const fieldToDelete = await prisma.field.findUnique({
        where: { id },
        include: { property: true },
      });

      if (!fieldToDelete) {
        throw new AppError('Talhão não encontrado.', 404);
      }

      if (fieldToDelete.property.ownerId !== userId) {
        throw new AppError(
          'Você não tem permissão para deletar este talhão.',
          403,
        );
      }

      await prisma.field.delete({
        where: { id },
      });
    } catch (error) {
      if (error instanceof AppError) throw error;
      console.error('Erro ao deletar talhão: ', error);
      throw new AppError(
        'Não foi possível deletar o talhão devido a um erro interno.',
        500,
      );
    }
  }
}
