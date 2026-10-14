import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/unit/**/*.{spec,test}.ts'],
    env: {
      DATABASE_URL: 'postgresql://test:test@localhost:5432/sulflux_test',
    },
    server: {
      deps: {
        inline: [/@lib\/shared/],
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
});
