import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    // Define o ambiente de testes como node
    environment: 'node',

    // Permite usar funções como `describe`, `it`, `expect` sem importar manualmente
    globals: true,

    // Desativa o paralelismo de arquivos para evitar colisões em constraints únicas do banco
    fileParallelism: false,

    // Arquivo executado antes de cada **arquivo de teste**
    setupFiles: ['vitest.setup.ts', 'dotenv/config'],

    // Executado uma única vez antes (setup) e depois (tearDown) da suíte inteira de testes
    globalSetup: ['vitest.global.setup.ts'],

    // Define quais arquivos serão considerados testes (unit e integration)
    include: ['tests/**/*.{spec,test}.ts'],

    // Tempo máximo para cada teste (em milissegundos) antes de falhar por timeout
    testTimeout: 15000,

    server: {
      deps: {
        // Obriga o Vitest a ler e compilar o código-fonte internamente,
        // em vez de delegar para o Node.js
        inline: [/@lib\/shared/],
      },
    },

    // Configuração de cobertura de testes
    coverage: {
      // Pasta onde os relatórios de cobertura serão gerados
      reportsDirectory: './coverage',

      // Usa o mecanismo de coverage nativo do Node.js
      provider: 'v8',

      // Quais arquivos serão analisados para cobertura de código
      include: ['src/**/*.ts'],

      // Arquivos e pastas que serão ignorados no relatório de cobertura
      exclude: [
        // Ignora arquivos de teste
        '**/*.test.ts',
        '**/*.spec.ts',

        // Ignora arquivos de configuração e tipos
        '**/types/**',
        '**/*.d.ts',
        '**/*.@types.ts',
        '**/prisma/**',
        '**/node_modules/**',
        '**/dist/**',

        // Ignora arquivos e pastas de mocks e utilitários de testes
        '**/*.mock.ts',
        '**/*.mocks.ts',
        '**/mocks/**',
        '**/__mocks__/**',
        '**/__tests__/**',
        '**/__test-utils__/**',
        '**/*.test-util.ts',
      ],
    },
  },
  resolve: {
    alias: {
      // Permite usar @/ como atalho para a pasta src
      '@': path.resolve(__dirname, 'src'),
    },
  },
});
