import * as argon2 from 'argon2';

export class PasswordService {
  /**
   * Configurações recomendadas pela OWASP para servidores backend.
   * Você pode ajustar esses valores via variáveis de ambiente no futuro
   * dependendo da capacidade de RAM e CPU da sua infraestrutura (Docker/AWS).
   */
  private static readonly options: argon2.Options & { raw?: false } = {
    type: argon2.argon2id,
    memoryCost: 65536, // 64 MB de RAM alocados por operação de hash
    timeCost: 3, // Número de iterações (aumenta o uso de CPU)
    parallelism: 4, // Threads utilizadas (ideal para servidores multi-core)
  };

  /**
   * Gera o hash seguro da senha.
   * @param password Senha em texto plano
   * @returns O hash gerado (inclui o salt automaticamente)
   */
  static async hash(password: string): Promise<string> {
    try {
      return await argon2.hash(password, this.options);
    } catch {
      // Aqui você pode integrar o log do Pino se quiser
      throw new Error('Falha ao gerar o hash da credencial.');
    }
  }

  /**
   * Verifica se a senha em texto plano bate com o hash salvo no banco.
   * @param hash O hash salvo no PostgreSQL via Prisma
   * @param plainPassword A senha fornecida pelo usuário no login
   * @returns Booleano indicando se a senha é válida
   */
  static async verify(hash: string, plainPassword: string): Promise<boolean> {
    try {
      if (await argon2.needsRehash(hash, this.options)) {
        // Verifica se a infraestrutura foi atualizada e o hash precisa de mais RAM/CPU
        console.warn(
          '[SECURITY] O hash atual está desatualizado e precisará de re-hashing automático.',
        );
      }
      return await argon2.verify(hash, plainPassword);
    } catch {
      return false; // Retorna falso em caso de erro interno de verificação
    }
  }
}
