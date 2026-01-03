import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'prisma/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Configuration Prisma 7.x (format ESM pour Docker)
 * L'URL de la base de données est définie via DATABASE_URL
 */
export default defineConfig({
  earlyAccess: true,
  schema: path.join(__dirname, 'schema.prisma'),
  migrate: {
    async schema() {
      return {
        datasourceUrl: process.env.DATABASE_URL,
      };
    },
  },
});
