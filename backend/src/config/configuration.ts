import { plainToInstance, Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  MinLength,
  validateSync,
} from 'class-validator';

enum NodeEnv {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

function toInt(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

export class EnvironmentVariables {
  @IsEnum(NodeEnv)
  NODE_ENV: NodeEnv = NodeEnv.Development;

  @Transform(({ value }) => toInt(value, 4000))
  @Type(() => Number)
  @IsInt()
  @Min(1)
  PORT = 4000;

  @IsString()
  @IsNotEmpty()
  APP_NAME = 'etude-panel-api';

  @IsString()
  @IsNotEmpty()
  API_PREFIX = 'api/v1';

  @IsString()
  @IsNotEmpty()
  DATABASE_URL!: string;

  @IsString()
  @MinLength(32)
  JWT_ACCESS_SECRET!: string;

  @IsString()
  @MinLength(32)
  JWT_REFRESH_SECRET!: string;

  @IsString()
  @IsNotEmpty()
  JWT_ACCESS_EXPIRES_IN = '15m';

  @IsString()
  @IsNotEmpty()
  JWT_REFRESH_EXPIRES_IN = '7d';

  @IsString()
  @IsNotEmpty()
  CORS_ORIGIN =
    'http://localhost:3000,http://127.0.0.1:3000,https://panel.etudepianoacademy.com';

  @Transform(({ value }) => toInt(value, 60_000))
  @Type(() => Number)
  @IsInt()
  @Min(1000)
  THROTTLE_TTL_MS = 60_000;

  @Transform(({ value }) => toInt(value, 100))
  @Type(() => Number)
  @IsInt()
  @Min(1)
  THROTTLE_LIMIT = 100;

  @IsOptional()
  @IsString()
  SEED_ADMIN_EMAIL?: string;

  @IsOptional()
  @IsString()
  SEED_ADMIN_PASSWORD?: string;

  @IsOptional()
  @IsString()
  SEED_STUDENT_PASSWORD?: string;
}

export function validateEnv(config: Record<string, unknown>) {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
    exposeDefaultValues: true,
  });
  const errors = validateSync(validated, {
    skipMissingProperties: false,
    whitelist: true,
    forbidUnknownValues: false,
  });
  if (errors.length > 0) {
    const message = errors
      .map((error) => Object.values(error.constraints ?? {}).join(', '))
      .join('; ');
    throw new Error(`Environment validation failed: ${message}`);
  }
  return validated;
}

export default () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '4000', 10),
  appName: process.env.APP_NAME ?? 'etude-panel-api',
  apiPrefix: process.env.API_PREFIX ?? 'api/v1',
  databaseUrl: process.env.DATABASE_URL,
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
  },
  corsOrigin: (
    process.env.CORS_ORIGIN ??
    'http://localhost:3000,http://127.0.0.1:3000,https://panel.etudepianoacademy.com'
  )
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  throttle: {
    ttl: parseInt(process.env.THROTTLE_TTL_MS ?? '60000', 10),
    limit: parseInt(process.env.THROTTLE_LIMIT ?? '100', 10),
  },
});
