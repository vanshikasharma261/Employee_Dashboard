import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

// Prisma 7 no longer auto-loads `.env`; `dotenv/config` above loads it so the
// CLI (migrate/generate) can read DATABASE_URL. No credentials are hardcoded.
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    // Prisma 7 reads the seed command from prisma.config.ts (not package.json).
    // `tsx` is used instead of `ts-node` because the generated Prisma client
    // imports modules with `.js` specifiers that ts-node cannot resolve.
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
