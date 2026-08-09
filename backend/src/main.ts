import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const config = app.get(ConfigService);
  const logger = app.get(Logger);
  app.useLogger(logger);

  const apiPrefix = config.getOrThrow<string>('apiPrefix');
  app.setGlobalPrefix(apiPrefix);

  app.use(helmet());
  app.use(cookieParser());

  app.enableCors({
    origin: config.getOrThrow<string[]>('corsOrigin'),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  if (config.get<string>('nodeEnv') !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Etude Panel API')
      .setDescription('REST API پنل هنرجویی چنددوره‌ای اتود')
      .setVersion('1.0.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
  }

  const port = config.get<number>('port') ?? 4000;
  await app.listen(port);
  logger.log(`API listening on http://localhost:${port}/${apiPrefix}`);
  if (config.get<string>('nodeEnv') !== 'production') {
    logger.log(`Swagger docs at http://localhost:${port}/docs`);
  }
}

void bootstrap();
