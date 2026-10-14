import 'dotenv/config';
import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import { defineConfig } from '@prisma/config';

const envFile =
  process.env.NODE_ENV === 'production' ||
  fs.existsSync(path.resolve(process.cwd(), '.env.production'))
    ? '.env.production'
    : fs.existsSync(path.resolve(process.cwd(), '.env.development'))
      ? '.env.development'
      : '.env';

dotenv.config({
  path: envFile,
});

const databaseUrl =
  process.env.DATABASE_URL ||
  (process.env.DB_USER && process.env.DB_HOST && process.env.DB_NAME
    ? `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT || 5434}/${process.env.DB_NAME}`
    : undefined);

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url:
      databaseUrl ??
      (() => {
        throw new Error('DATABASE_URL não definida');
      })(),
  },
});
