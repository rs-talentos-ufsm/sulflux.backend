import { prisma } from '../../infra/database';
import { AppError } from '../../utils/AppError';
import {
  CreatePropertyDTO,
  UpdatePropertyDTO,
  PropertyResponseDTO,
  PaginatedPropertiesDTO,
  PropertyStatus,
  PropertyQueryDTO,
} from '@lib/shared';

export class PropertyService {
  /**
   * Cria uma nova propriedade
   */
  public async create(
    data: CreatePropertyDTO,
    userId: string,
  ): Promise<PropertyResponseDTO> {
    try {
      const newProperty = await prisma.property.create({
        data: {
          ...data,
          ownerId: userId,
          status: PropertyStatus.Configure,
        },
      });

      return newProperty as unknown as PropertyResponseDTO;
    } catch (error) {
      console.error('Erro ao criar propriedade: ', error);
      throw new AppError(
        'Não foi possível criar a propriedade devido a um erro interno.',
        500,
      );
    }
  }

  /**
   * Busca todas as propriedades do usuário com paginação e filtros
   */
  public async findAll(
    userId: string,
    filters: PropertyQueryDTO,
  ): Promise<PaginatedPropertiesDTO> {
    try {
      const { page = 1, limit = 10, query, status } = filters;
      const skip = (page - 1) * limit;

      const whereCondition: any = { ownerId: userId };

      if (status) {
        whereCondition.status = status;
      }

      if (query) {
        whereCondition.OR = [
          { name: { contains: query, mode: 'insensitive' } },
          { location: { contains: query, mode: 'insensitive' } },
          { car: { contains: query, mode: 'insensitive' } },
        ];
      }

      const [count, properties] = await prisma.$transaction([
        prisma.property.count({ where: whereCondition }),
        prisma.property.findMany({
          where: whereCondition,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
      ]);

      return {
        data: properties as unknown as PropertyResponseDTO[],
        meta: {
          totalItems: count,
          totalPages: Math.ceil(count / limit),
          currentPage: page,
          itemsPerPage: limit,
        },
      };
    } catch (error) {
      console.error('Erro ao listar propriedades: ', error);
      throw new AppError(
        'Não foi possível buscar as propriedades devido a um erro interno.',
        500,
      );
    }
  }

  /**
   * Busca uma propriedade específica pelo ID
   */
  public async findById(
    id: string,
    userId: string,
  ): Promise<PropertyResponseDTO> {
    try {
      const property = await prisma.property.findFirst({
        where: { id, ownerId: userId },
      });

      if (!property) {
        throw new AppError('Propriedade não encontrada.', 404);
      }

      return property as unknown as PropertyResponseDTO;
    } catch (error) {
      if (error instanceof AppError) throw error;
      console.error('Erro ao buscar propriedade: ', error);
      throw new AppError(
        'Não foi possível buscar a propriedade devido a um erro interno.',
        500,
      );
    }
  }

  /**
   * Atualiza uma propriedade existente
   */
  public async update(
    id: string,
    userId: string,
    data: UpdatePropertyDTO,
  ): Promise<PropertyResponseDTO> {
    try {
      const propertyToUpdate = await prisma.property.findUnique({
        where: { id },
      });

      if (!propertyToUpdate) {
        throw new AppError('Propriedade não encontrada.', 404);
      }

      if (propertyToUpdate.ownerId !== userId) {
        throw new AppError(
          'Você não tem permissão para atualizar esta propriedade.',
          403,
        );
      }

      const updatedProperty = await prisma.property.update({
        where: { id },
        data,
      });

      return updatedProperty as unknown as PropertyResponseDTO;
    } catch (error) {
      if (error instanceof AppError) throw error;
      console.error('Erro ao atualizar propriedade: ', error);
      throw new AppError(
        'Não foi possível atualizar a propriedade devido a um erro interno.',
        500,
      );
    }
  }

  /**
   * Deleta uma propriedade
   */
  public async delete(id: string, userId: string): Promise<void> {
    try {
      const propertyToDelete = await prisma.property.findUnique({
        where: { id },
      });

      if (!propertyToDelete) {
        throw new AppError('Propriedade não encontrada.', 404);
      }

      if (propertyToDelete.ownerId !== userId) {
        throw new AppError(
          'Você não tem permissão para deletar esta propriedade.',
          403,
        );
      }

      await prisma.property.delete({
        where: { id },
      });
    } catch (error) {
      if (error instanceof AppError) throw error;
      console.error('Erro ao deletar propriedade: ', error);
      throw new AppError(
        'Não foi possível deletar a propriedade devido a um erro interno.',
        500,
      );
    }
  }
}
