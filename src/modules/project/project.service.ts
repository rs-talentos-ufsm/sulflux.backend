import { prisma } from '../../infra/database.js';
import { AppError } from '../../utils/AppError.js';
import {
  CreateProjectDTO,
  UpdateProjectDTO,
  ProjectResponseDTO,
  PaginatedProjectsDTO,
  ProjectRole,
} from '@lib/shared';

export class ProjectService {
  /**
   * Creates a new project.
   * @param projectData - DTO with the new project's data.
   * @returns The created project object.
   */
  public async create(
    projectData: CreateProjectDTO,
    ownerId: string,
  ): Promise<ProjectResponseDTO> {
    try {
      const newProject = await prisma.project.create({
        data: {
          ...projectData,
          ownerId,
          members: {
            create: [
              // Add owner as a member of the task
              {
                userId: ownerId,
                role: ProjectRole.Owner,
              },
            ],
          },
        },
        include: {
          members: true, // Include members in the response
        },
      });

      return newProject;
    } catch (error) {
      console.error('Erro ao criar projeto: ', error);
      throw new AppError(
        'Não foi possível criar o projeto devido a um erro interno.',
        500,
      );
    }
  }

  /**
   * Searches for a project by its ID.
   * @param id - The ID of the project to search for.
   * @returns Returns the data for the searched project.
   * @throws AppError if the project is not found.
   */
  public async findById(
    id: string,
    userId: string,
  ): Promise<ProjectResponseDTO> {
    try {
      const project = await prisma.project.findFirst({
        where: {
          id,
          OR: [{ ownerId: userId }, { members: { some: { userId } } }],
        },
        include: {
          members: true,
        },
      });

      if (!project) {
        throw new AppError('Projeto não encontrado ou acesso negado.', 404);
      }

      return project;
    } catch (error) {
      if (error instanceof AppError) throw error;
      console.error('Erro ao buscar projeto: ', error);
      throw new AppError(
        'Não foi possível buscar o projeto devido a um erro interno.',
        500,
      );
    }
  }

  /**
   * Searches for projects with pagination.
   * @param page - The page number to return.
   * @param limit - The number of items per page.
   * @returns An object with the pagination data and the list of projects.
   */
  public async findAll(
    userId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<PaginatedProjectsDTO> {
    try {
      const skip = (page - 1) * limit;

      // Condição de acesso: o usuário deve ser o dono do projeto ou um membro do projeto
      const accessCondition = {
        OR: [{ ownerId: userId }, { members: { some: { userId: userId } } }],
      };

      const [count, projects] = await prisma.$transaction([
        prisma.project.count({
          where: accessCondition,
        }),
        prisma.project.findMany({
          where: accessCondition,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            members: true,
          },
        }),
      ]);

      // Retornando no padrão { data, meta } que definimos no common.types.ts
      return {
        data: projects,
        meta: {
          totalItems: count,
          totalPages: Math.ceil(count / limit),
          currentPage: page,
          itemsPerPage: limit,
        },
      };
    } catch (error) {
      console.error('Erro ao listar projetos: ', error);
      throw new AppError(
        'Não foi possível buscar os projetos devido a um erro interno.',
        500,
      );
    }
  }

  /**
   * Updates an existing project.
   * @param id - project id.
   * @param projectData - DTO with the updated project data.
   * @throws AppError if the project cannot be found.
   * @returns Returns the updated project data.
   */
  public async update(
    id: string,
    userId: string,
    projectData: UpdateProjectDTO,
  ): Promise<ProjectResponseDTO> {
    try {
      const projectToUpdate = await prisma.project.findUnique({
        where: { id },
      });

      if (!projectToUpdate) {
        throw new AppError('Projeto não encontrado.', 404);
      }

      if (projectToUpdate.ownerId !== userId) {
        throw new AppError(
          'Você não tem permissão para editar este projeto.',
          403,
        );
      }

      const { memberIds, ...data } = projectData;

      const updatedProject = await prisma.project.update({
        where: { id },
        data: {
          ...data,
          ...(memberIds !== undefined && {
            members: {
              deleteMany: {
                userId: { not: data.ownerId },
              },
              create: memberIds
                .filter((id: string) => id !== data.ownerId)
                .map((memberId: string) => ({
                  userId: memberId,
                  role: ProjectRole.Member,
                })),
            },
          }),
        },
        include: { members: true },
      });

      return updatedProject;
    } catch (error) {
      if (error instanceof AppError) throw error;
      console.error('Erro ao atualizar projeto: ', error);
      throw new AppError(
        'Não foi possível atualizar o projeto devido a um erro interno.',
        500,
      );
    }
  }

  /**
   * Deletes a project.
   * @param id - project id.
   * @param userId - The ID of the user attempting to delete the project.
   * @throws AppError if the project does not exist or the user is not the owner.
   */
  public async delete(id: string, userId: string): Promise<void> {
    try {
      const projectToDelete = await prisma.project.findUnique({
        where: { id },
      });

      if (!projectToDelete) {
        throw new AppError('Projeto não encontrado.', 404);
      }

      if (projectToDelete.ownerId !== userId) {
        throw new AppError(
          'Você não tem permissão para deletar este projeto.',
          403,
        );
      }

      await prisma.project.delete({
        where: { id },
      });
    } catch (error) {
      if (error instanceof AppError) throw error;
      console.error('Erro ao deletar projeto: ', error);
      throw new AppError(
        'Não foi possível deletar o projeto devido a um erro interno.',
        500,
      );
    }
  }
}
