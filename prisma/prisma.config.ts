import path from 'node:path';
import { defineConfig } from 'prisma/config';

/**
 * Configuration Prisma 7.x
 * L'URL de la base de données est maintenant définie ici (Prisma 7+)
 * 
 * @see https://www.prisma.io/docs/orm/reference/prisma-config-reference
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
