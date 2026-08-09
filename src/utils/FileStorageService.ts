import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { AppError } from './AppError.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UPLOADS_DIR_NAME = process.env.UPLOADS_DIR_PATH || 'uploads';
const UPLOADS_DIR = path.join(__dirname, '..', '..', UPLOADS_DIR_NAME);

interface NodeSystemError extends Error {
  code?: string;
}

export class FileStorageService {
  public async uploadFile(
    fileBuffer: Buffer,
    originalFileName: string,
  ): Promise<string> {
    try {
      const fileExtension = path.extname(originalFileName);
      const uniqueFileName = `${crypto.randomUUID()}${fileExtension}`;
      const storagePath = path.join(UPLOADS_DIR, uniqueFileName);

      await fs.mkdir(UPLOADS_DIR, { recursive: true });
      await fs.writeFile(storagePath, fileBuffer);

      return uniqueFileName;
    } catch (error) {
      console.error('Erro ao salvar o arquivo: ', error);
      throw new AppError('Falha no upload do arquivo.', 500);
    }
  }

  public async deleteFile(storagePath: string): Promise<void> {
    const fullPath = path.join(UPLOADS_DIR, storagePath);

    try {
      await fs.unlink(fullPath);
    } catch (error: unknown) {
      const nodeError = error as NodeSystemError;

      if (nodeError.code !== 'ENOENT') {
        console.error('Erro ao deletar o arquivo: ', error);
        throw new AppError(
          'Não foi possível deletar o arquivo devido a um erro no servidor de armazenamento.',
          500,
        );
      }
    }
  }
}
