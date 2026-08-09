import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { PrismaClient, TaskPriority } = require('@prisma/client');
import { Prisma } from '@prisma/client/scripts/default-index.js';
import readline from 'readline';
import { PasswordService } from '../src/utils/password.service';

const prisma = new PrismaClient();

async function seedDatabase() {
  console.log('Starting seeder...');

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    // 1. Limpeza (De baixo para cima nas relações para evitar erro de Foreign Key)
    console.log('Cleaning existing data...');
    await tx.task.deleteMany();
    await tx.project.deleteMany();
    await tx.refreshToken.deleteMany();
    await tx.user.deleteMany();
    console.log('Tables cleaned.');

    // 2. Criação do Usuário
    console.log('Seeding User...');
    const password = 'Usertest123';
    const hashedPassword = await PasswordService.hash(password);

    const user = await tx.user.create({
      data: {
        name: 'Fernando Dorneles',
        email: 'fernandodorneles95@gmail.com',
        password: hashedPassword,
        is_active: true,
      },
    });

    // 3. Criação de um Projeto
    console.log('Seeding Project...');
    const project = await tx.project.create({
      data: {
        name: 'PGI-PROA',
      },
    });

    // 4. Criação de Tarefas
    console.log('Seeding Tasks...');
    await tx.task.createMany({
      data: [
        {
          title: 'Configurar migrações no Docker',
          description:
            'Ajustar scripts de makefile e schema do Prisma para aceitar UUIDs.',
          priority: TaskPriority.HIGH,
          projectId: project.id,
          dueDate: new Date(new Date().setDate(new Date().getDate() + 2)), // Daqui a 2 dias
        },
        {
          title: 'Refatorar tela de Tasks no Frontend',
          description:
            'Trocar dados mockados pela requisição real via React Query.',
          priority: TaskPriority.URGENT,
          projectId: project.id,
          dueDate: new Date(), // Hoje
        },
      ],
    });

    console.log(`User created with ID: ${user.id}`);
  });

  console.log('Database seeded succesfully! 🌱');
}

// --- Função de Confirmação com Bypass ---
function startSeederWithConfirmation() {
  // Se passarmos a flag --force, ele pula a pergunta e roda direto
  const args = process.argv.slice(2);
  if (args.includes('--force')) {
    console.log('Flag --force detectada. Iniciando seed sem prompt...');
    return executeSeed();
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log('--- Database Seeder ---');
  console.warn(
    '\n⚠️  ATENÇÃO: Este script irá apagar TODOS os dados das tabelas e substituí-los por dados de teste.',
  );

  rl.question('\nVocê tem certeza que deseja continuar? (y/N) ', (answer) => {
    const confirmed = answer.toLocaleLowerCase().trim();

    if (confirmed === 'y' || confirmed === 'yes') {
      console.log('Confirmação recebida. Iniciando o processo de seed...');
      rl.close();
      executeSeed();
    } else {
      console.log('Operação cancelada pelo usuário.');
      rl.close();
      process.exit(0);
    }
  });
}

function executeSeed() {
  seedDatabase()
    .catch((error) => {
      console.error('Seeder script execution failed: ', error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

startSeederWithConfirmation();
