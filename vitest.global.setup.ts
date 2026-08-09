// vitest.global.setup.ts
import { execSync } from 'node:child_process';
import net from 'node:net';
import dotenv from 'dotenv';

// Carrega as variáveis de teste explicitamente para garantir que
// DATABASE_URL esteja disponível para o comando do Prisma
dotenv.config({ path: '.env.test' });

// Porta do banco definida no .env.test ou padrão 5433 para evitar conflitos com o ambiente local
const DB_PORT = Number(process.env.DB_PORT) || 5433;

/**
 * Função auxiliar para aguardar o banco estar aceitando conexões TCP.
 * Muito mais seguro que um setTimeout fixo.
 */
async function waitForPort(port: number, timeout = 5000): Promise<void> {
  const start = Date.now();

  return new Promise((resolve, reject) => {
    const tryConnect = () => {
      if (Date.now() - start > timeout) {
        return reject(new Error(`Timeout ao tentar conectar na porta ${port}`));
      }

      const socket = new net.Socket();

      socket.connect(port, 'localhost', () => {
        socket.end(); // Conexão bem sucedida, fecha e retorna
        resolve();
      });

      socket.on('error', () => {
        socket.destroy();
        setTimeout(tryConnect, 100);
      });
    };

    tryConnect();
  });
}

export async function setup() {
  console.log('\n🚀 [Vitest] Inicializando checagem do ambiente global...');

  try {
    // 1. Aguarda a porta estar aberta (Healthcheck real)
    console.log(
      `⏳ [Rede] Verificando se a porta ${DB_PORT} está respondendo...`,
    );
    await waitForPort(DB_PORT);
    console.log('🔌 [Rede] Conexão TCP validada com sucesso!');

    // 2. Roda as migrations do Prisma
    console.log('🔄 [Prisma] Sincronizando banco de dados (migrate deploy)...');
    execSync('npx prisma migrate deploy', {
      stdio: 'inherit',
      env: {
        ...process.env,
        DATABASE_URL: process.env.DATABASE_URL,
      },
    });

    console.log(
      '✅ [Setup] Ambiente validado. Iniciando execução dos testes...\n',
    );
  } catch (error) {
    console.error('\n❌ [Erro Crítico] Falha na validação do Global Setup:');
    console.error(error);
    process.exit(1);
  }
}

export async function teardown() {
  console.log(
    '\n🧹 [Vitest] Finalizando suíte de testes e liberando o processo...',
  );
}
