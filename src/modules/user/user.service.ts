import { excludePassword } from '../../utils/excludePassword.js';
import { prisma } from '../../infra/database.js';
import { AppError } from '../../utils/AppError.js';
import { PasswordService } from '../../utils/password.service.js';
import {
  CreateUserDTO,
  UpdateUserDTO,
  UserResponseDTO,
  PaginatedUsersDTO,
} from '@lib/shared';

export class UserService {
  /**
   * Creates a new user, ensuring password encryption.
   * @param userData - DTO with the new user's data.
   * @returns The created user object, without the password hash.
   * @throws AppError if a user with the same email address already exists.
   * @author Eng. G. Dorneles, Fernando
   */
  public async create(userData: CreateUserDTO): Promise<UserResponseDTO> {
    try {
      const existingUser = await prisma.user.findUnique({
        where: { email: userData.email },
      });

      if (existingUser) {
        throw new AppError(
          'Já existe um usuário cadastrado com este e-mail.',
          409,
        );
      }

      const hashedPassword = await PasswordService.hash(userData.password);

      const newUser = await prisma.user.create({
        data: {
          ...userData,
          password: hashedPassword,
          is_active: true,
        },
      });

      const safeUser = excludePassword(newUser);
      return safeUser as UserResponseDTO;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error('Erro ao criar usuário: ', error);
      throw new AppError(
        'Não foi possível criar o usuário devido a um erro interno.',
        500,
      );
    }
  }

  /**
   * Searches for a user by their ID, including relevant associations.
   * @param id - The ID of the user to search for.
   * @returns Returns the data for the searched user.
   * @throws AppError if the user is not found.
   * @author Eng. G. Dorneles, Fernando
   */
  public async findById(id: string): Promise<UserResponseDTO> {
    try {
      const user = await prisma.user.findUnique({
        where: { id },
      });

      if (!user) {
        throw new AppError('Usuário não encontrado.', 404);
      }

      const safeUser = excludePassword(user);
      return safeUser as UserResponseDTO;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error('Erro ao buscar usuário: ', error);
      throw new AppError(
        'Não foi possível buscar o usuário devido a um erro interno.',
        500,
      );
    }
  }

  /**
   * Searches for all active users with pagination.
   * @param page - The page number to return.
   * @param limit - The number of items per page.
   * @returns An object with the pagination data and the list of users.
   * @author Eng. G. Dorneles, Fernando
   */
  public async findAll(
    page: number = 1,
    limit: number = 10,
  ): Promise<PaginatedUsersDTO> {
    try {
      const skip = (page - 1) * limit;

      const [count, users] = await prisma.$transaction([
        prisma.user.count({
          where: { is_active: true },
        }),
        prisma.user.findMany({
          where: { is_active: true },
          skip,
          take: limit,
          orderBy: { name: 'asc' },
        }),
      ]);

      const safeUsers = users.map(excludePassword);

      // Envelopando a paginação na chave 'meta' para manter o padrão comum!
      return {
        data: safeUsers as UserResponseDTO[],
        meta: {
          totalItems: count,
          totalPages: Math.ceil(count / limit),
          currentPage: page,
          itemsPerPage: limit,
        },
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error('Erro ao buscar usuários: ', error);
      throw new AppError(
        'Não foi possível buscar os usuários devido a um erro interno.',
        500,
      );
    }
  }

  /**
   * Updates an existing user.
   * @param id - user id.
   * @param userData - DTO with the updated user data.
   * @throws AppError if the user cannot be found.
   * @throws AppError if a user with the email address already exists.
   * @returns Returns the updated user data.
   * @author Eng. G. Dorneles, Fernando
   */
  public async update(
    id: string,
    userData: UpdateUserDTO,
  ): Promise<UserResponseDTO> {
    try {
      const userToUpdate = await prisma.user.findFirst({
        where: { id },
      });

      if (!userToUpdate) {
        throw new AppError('Usuário não encontrado.', 404);
      }

      if (userData.email && userData.email !== userToUpdate.email) {
        const existingUser = await prisma.user.findFirst({
          where: {
            email: userData.email,
            // deletedAt: null,
          },
        });

        if (existingUser && existingUser.id !== id) {
          throw new AppError(
            'Já existe um usuário cadastrado com este e-mail.',
            409,
          );
        }
      }

      const dataToUpdate: any = { ...userData };

      if (dataToUpdate.password) {
        const password = dataToUpdate.password;
        dataToUpdate.password = await PasswordService.hash(password);
      }

      const updatedUser = await prisma.user.update({
        where: { id },
        data: dataToUpdate,
      });

      if (!updatedUser) {
        throw new AppError('Falha ao buscar usuário atualizado.', 404);
      }

      const safeUser = excludePassword(updatedUser);
      return safeUser as UserResponseDTO;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error('Erro ao atualizar usuário: ', error);
      throw new AppError(
        'Não foi possível atualizar o usuário devido a um erro interno.',
        500,
      );
    }
  }

  /**
   * "Delete" user (Soft Delete).
   * @param id - user id.
   * @throws AppError if the user does not exist.
   * @author Eng. G. Dorneles, Fernando
   */
  public async delete(id: string): Promise<void> {
    // <-- Alterado para void
    try {
      const userToDelete = await prisma.user.findUnique({
        where: { id },
      });

      if (!userToDelete) {
        throw new AppError('Usuário não encontrado.', 404);
      }

      await prisma.user.update({
        where: { id },
        data: { is_active: false },
      });

      // Removido o retorno, já que o controller manda 204 No Content
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error('Erro ao deletar usuário: ', error);
      throw new AppError(
        'Não foi possível deletar o usuário devido a um erro interno.',
        500,
      );
    }
  }
}
