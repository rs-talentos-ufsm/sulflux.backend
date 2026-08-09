# Segurança e Criptografia: Hashing de Senhas com Argon2

A segurança das credenciais é um pilar crítico em arquiteturas de backend modernas. Com a constante evolução do poder computacional, algoritmos de criptografia que antes eram considerados seguros tornaram-se vulneráveis a ataques de força bruta. É aqui que entra a adoção do **Argon2**.

## 1. O que é o Argon2?

Algoritmos tradicionais baseiam sua segurança apenas no "custo de tempo" (exigindo mais processamento da CPU). O Argon2 é uma função de derivação de chave moderna que introduz o conceito de _memory-hardness_ (custo de memória), tornando-o resistente a ataques em larga escala.

### Principais Benefícios:

- **Resistência a Hardware Especializado:** Como o Argon2 exige a alocação de blocos de memória RAM para calcular o hash, ele inviabiliza ataques de força bruta que utilizam clusters de GPUs ou chips ASICs, que possuem milhares de núcleos, mas pouca memória individual.
- **Controle Tridimensional:** Permite um ajuste fino baseado na infraestrutura do servidor através de três eixos: tempo de execução (CPU), consumo de memória (RAM) e grau de paralelismo (Threads).
- **Mecanismo de Atualização (_needsRehash_):** Permite detectar se um hash salvo no banco foi gerado com parâmetros de segurança antigos, facilitando a migração transparente e contínua para níveis de segurança maiores conforme o hardware do servidor evolui.

## 2. Por que escolher o Argon2 em vez do Bcrypt?

O ecossistema Node.js utilizou o `bcryptjs` como padrão por muitos anos. No entanto, buscando a melhor tecnologia e as práticas mais seguras da atualidade, o **Argon2** é a escolha definitiva.

- **Vencedor da PHC:** O Argon2 foi o vencedor da _Password Hashing Competition_ (PHC) em 2015, um esforço global para identificar o sucessor do Bcrypt e do PBKDF2.
- **Recomendação da OWASP:** A OWASP (referência máxima em segurança web) recomenda explicitamente o uso da variante **Argon2id** como o padrão primário para o armazenamento de credenciais.
- **Defesa Contra Canais Laterais:** A variante Argon2id combina a resistência a ataques de canal lateral (side-channel attacks) e a proteção extrema contra ataques baseados em placas de vídeo.

## 3. Instalação

A instalação contempla a remoção do ecossistema antigo (caso exista) e a adição do pacote oficial do Argon2, que já conta com _bindings_ otimizados em C++ para máxima performance no Node.js.

```bash
# Remoção do ecossistema antigo (se aplicável)
npm uninstall bcryptjs @types/bcryptjs

# Dependência de produção (as tipagens já vêm embutidas)
npm install argon2

```

## 4. Implementação Técnica

Para manter a arquitetura limpa e favorecer a reutilização em um ambiente modular (Shared Kernel), a regra de negócio da criptografia deve ser isolada em um serviço central.

### Passo 1: Configuração Central (`src/security/PasswordService.ts`)

```typescript
import * as argon2 from 'argon2';

export class PasswordService {
  /**
   * Configurações recomendadas pela OWASP para servidores backend.
   */
  private static readonly options: argon2.Options & { raw?: false } = {
    type: argon2.argon2id,
    memoryCost: 65536, // 64 MB de RAM alocados por operação de hash
    timeCost: 3, // Número de iterações (custo de CPU)
    parallelism: 4, // Threads utilizadas na operação
  };

  /**
   * Gera o hash seguro da senha.
   * @param password Senha em texto plano
   */
  static async hash(password: string): Promise<string> {
    try {
      return await argon2.hash(password, this.options);
    } catch (error) {
      throw new Error('Falha ao gerar o hash da credencial.');
    }
  }

  /**
   * Verifica se a senha em texto plano bate com o hash salvo.
   * @param hash O hash salvo no banco de dados
   * @param plainPassword A senha fornecida pelo usuário no login
   */
  static async verify(hash: string, plainPassword: string): Promise<boolean> {
    try {
      // Verifica se a infraestrutura foi atualizada e o hash precisa de mais RAM/CPU
      if (await argon2.needsRehash(hash, this.options)) {
        console.warn(
          '[SECURITY] O hash atual está desatualizado e precisará de re-hashing automático.',
        );
        // Em um fluxo real, após retornar 'true', o sistema deve gerar um novo hash e dar update no banco.
      }
      return await argon2.verify(hash, plainPassword);
    } catch (error) {
      return false;
    }
  }
}
```

### Passo 2: Integração com o Controller (`src/controllers/AuthController.ts`)

Exemplo de como o serviço é consumido de forma limpa durante os processos de registro e autenticação.

```typescript
import { Request, Response } from 'express';
import { PasswordService } from '../security/PasswordService';
// Importação fictícia do repositório/prisma
import { userRepository } from '../repositories/userRepository';

export class AuthController {
  static async register(req: Request, res: Response) {
    const { email, password } = req.body;

    // Utilização do serviço isolado para gerar o hash
    const hashedPassword = await PasswordService.hash(password);

    const user = await userRepository.create({
      email,
      password: hashedPassword,
    });

    return res.status(201).json({ id: user.id, email: user.email });
  }

  static async login(req: Request, res: Response) {
    const { email, password } = req.body;

    const user = await userRepository.findByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    // Validação da senha utilizando o Argon2
    const isValid = await PasswordService.verify(user.password, password);
    if (!isValid) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    return res
      .status(200)
      .json({ message: 'Autenticação bem-sucedida', token: '...' });
  }
}
```

### Testes Automatizados de Integração (E2E)

Para garantir que a configuração do algoritmo e o comportamento de verificação funcionem conforme o esperado, criamos testes focados nas funções de validação cruzada do hash.

```typescript
import { describe, expect, it } from 'vitest';
import { PasswordService } from '../../src/security/PasswordService';
import * as argon2 from 'argon2';

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
```
