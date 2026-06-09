import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global API prefix (project convention: all routes under /api).
  app.setGlobalPrefix('api');

  // Ensure Nest lifecycle hooks (e.g. PrismaService.onModuleDestroy) run on
  // process signals so the database connection is closed gracefully.
  app.enableShutdownHooks();

  const configService = app.get(ConfigService);
  const port = configService.get<string>('PORT') ?? 3000;
  await app.listen(port);
}
bootstrap();
