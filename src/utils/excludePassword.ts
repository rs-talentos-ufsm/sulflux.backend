import { UserResponseDTO } from '@lib/shared';

export function excludePassword(user: any): UserResponseDTO {
  const { password: _, ...userWithoutPassword } = user;
  return userWithoutPassword as UserResponseDTO;
}
