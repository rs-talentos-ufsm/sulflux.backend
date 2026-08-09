import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { app } from '../../helpers/createAppTest';
import { logIfFail } from '../../helpers/testLogger';
import { prisma } from '../../../src/infra/database';

describe('Integration | User | Create', () => {
  it('should create a new user successfully', async () => {
    // Arrange, Act, Assert (AAA pattern)
    // 1. Arrange (Preparação)
    const newUserData = {
      name: 'Test User',
      email: 'test@example.com',
      password: 'securePassword123',
    };

    // 2. Act (Ação, Chamada da função)
    const response = await request(app).post('/api/users').send(newUserData);

    // Verifica erros
    logIfFail(response);

    // 3. Assert
    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
    expect(response.body.email).toBe(newUserData.email);

    expect(response.body).not.toHaveProperty('password');

    // 4. Double Check (Validação no Banco de Dados)
    // Isso garante que o dado realmente foi persistido
    const userInDb = await prisma.user.findUnique({
      where: { email: newUserData.email },
    });

    expect(userInDb).toBeTruthy();
    expect(userInDb?.name).toBe(newUserData.name);
  });

  it('should not be able to create a user with duplicate email', async () => {
    // 1. Cria o primeiro usuário diretamente no banco (atalho para setup)
    await prisma.user.create({
      data: {
        name: 'User Existente',
        email: 'duplicated@test.com',
        password: 'securePassword123',
      },
    });

    // 2. Tenta criar o mesmo usuário via API
    const response = await request(app).post('/api/users').send({
      name: 'Tentativa Duplicada',
      email: 'duplicated@test.com',
      password: 'securePassword123',
    });

    // Verifica erros
    // logIfFail(response);

    // 3. Espera erro (409 Conflict)
    expect(response.status).toBe(409);
  });
});
