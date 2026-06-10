import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

// Prisma 7 no longer auto-loads `.env`; `dotenv/config` above loads it so the
// CLI (migrate/generate) can read DATABASE_URL. No credentials are hardcoded.
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
