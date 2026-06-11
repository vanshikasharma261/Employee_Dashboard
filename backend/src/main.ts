import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { ValidationError } from 'class-validator';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);

  // Global API prefix (project convention: all routes under /api).
  app.setGlobalPrefix('api');

  // Lock CORS to the known frontend origin. `credentials: true` is required so
  // the browser sends/stores the httpOnly auth cookies on cross-origin requests.
  app.enableCors({
    origin:
      configService.get<string>('FRONTEND_URL') ?? 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  });

  // Parse cookies so the JWT strategy and refresh flow can read the
  // access-token / refresh-token httpOnly cookies from `request.cookies`.
  app.use(cookieParser());

  // Global validation. `whitelist` strips unknown properties; `transform`
  // applies DTO @Transform decorators and type coercion. The exceptionFactory
  // maps validation errors to a flat, field-keyed object for the frontend,
  // e.g. { "email": "Invalid email format", "password": "Password is required" }.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      exceptionFactory: (errors: ValidationError[]) => {
        const formatted = errors.reduce<Record<string, string>>(
          (acc, error) => {
            const constraints = error.constraints;
            if (constraints) {
              acc[error.property] = Object.values(constraints)[0];
            }
            return acc;
          },
          {},
        );
        return new BadRequestException(formatted);
      },
    }),
  );

  // Ensure Nest lifecycle hooks (e.g. PrismaService.onModuleDestroy) run on
  // process signals so the database connection is closed gracefully.
  app.enableShutdownHooks();

  const port = configService.get<string>('PORT') ?? 3000;
  await app.listen(port);
}
void bootstrap();
