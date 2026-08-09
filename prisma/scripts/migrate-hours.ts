// import dotenv from 'dotenv';
// dotenv.config({ path: '.env.development' });

// import { PrismaClient } from '@prisma/client';
// import { PrismaPg } from '@prisma/adapter-pg';
// import { Pool } from 'pg';

// const pool = new Pool({
//   connectionString: process.env.DATABASE_URL,
// });

// const prisma = new PrismaClient({
//   adapter: new PrismaPg(pool),
// });

// async function convertHoursToMinutes() {
//   console.log("Iniciando migração de horas para minutos...");

//   const tasks = await prisma.task.findMany();

//   let count = 0;
//   for (const task of tasks) {
//     // const hours = Number(task.hours) || 0;
//     const minutes = Math.round(hours * 60);

//     await prisma.task.update({
//       where: { id: task.id },
//       data: {
//         hours: minutes
//       }
//     });
//     count++;
//   }

//   // console.log(`Migração concluída! ${count} tarefas atualizadas.`);
// }

// convertHoursToMinutes()
//   .catch(console.error)
//   .finally(async () => {
//     await prisma.$disconnect();
//     await pool.end();
//   });
