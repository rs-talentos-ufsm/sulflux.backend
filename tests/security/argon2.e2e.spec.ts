import { describe, expect, it } from 'vitest';
import { PasswordService } from '../../src/utils/password.service';

describe('[Unit/Integration] PasswordService com Argon2', () => {
  it('deve gerar um hash válido que contenha o identificador argon2id', async () => {
    const plainPassword = 'senhaSuperSegura123!';
    const hash = await PasswordService.hash(plainPassword);

    expect(hash).toBeDefined();
    expect(typeof hash).toBe('string');
    expect(hash.startsWith('$argon2id$')).toBe(true);
  });

  it('deve validar corretamente uma senha em texto plano contra o seu hash', async () => {
    const plainPassword = 'senhaSuperSegura123!';
    const hash = await PasswordService.hash(plainPassword);

    const isValid = await PasswordService.verify(hash, plainPassword);
    expect(isValid).toBe(true);
  });

  it('deve rejeitar uma senha incorreta contra um hash válido', async () => {
    const plainPassword = 'senhaSuperSegura123!';
    const wrongPassword = 'senhaIncorreta123!';
    const hash = await PasswordService.hash(plainPassword);

    const isValid = await PasswordService.verify(hash, wrongPassword);
    expect(isValid).toBe(false);
  });

  it('deve acusar erro ao tentar verificar um hash corrompido', async () => {
    const invalidHash = '$argon2id$v=19$m=65536,t=3,p=4$HASHCORROMPIDO';
    const plainPassword = 'qualquerSenha';

    const isValid = await PasswordService.verify(invalidHash, plainPassword);
    // O catch no serviço deve capturar o erro do parser do argon2 e retornar false
    expect(isValid).toBe(false);
  });
});
