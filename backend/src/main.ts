import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { UploadsService } from './uploads/uploads.service';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });
  const config = app.get(ConfigService);
  const logger = app.get(Logger);
  app.useLogger(logger);

  const apiPrefix = config.getOrThrow<string>('apiPrefix');
  app.setGlobalPrefix(apiPrefix);

  const isProd = config.get<string>('nodeEnv') === 'production';

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      // Swagger UI needs inline scripts/styles in development
      contentSecurityPolicy: isProd
        ? undefined
        : {
            directives: {
              defaultSrc: ["'self'"],
              styleSrc: ["'self'", "'unsafe-inline'"],
              imgSrc: ["'self'", 'data:', 'validator.swagger.io'],
              scriptSrc: ["'self'", "'unsafe-inline'"],
              scriptSrcAttr: ["'none'"],
            },
          },
    }),
  );
  app.use(cookieParser());
  app.use(app.get(UploadsService).middleware());

  const allowedOrigins = config.getOrThrow<string[]>('corsOrigin');
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });

  app.useBodyParser('json', { limit: '12mb' });
  app.useBodyParser('urlencoded', { limit: '12mb', extended: true });

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
