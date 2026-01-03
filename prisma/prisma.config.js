const path = require('node:path');

/**
 * Configuration Prisma 7.x (format JS pour Docker)
 * L'URL de la base de données est définie via DATABASE_URL
 * 
 * @see https://www.prisma.io/docs/orm/reference/prisma-config-reference
 */
module.exports = {
  earlyAccess: true,
  schema: path.join(__dirname, 'schema.prisma'),
  migrate: {
    async schema() {
      return {
        datasourceUrl: process.env.DATABASE_URL,
      };
    },
  },
};
