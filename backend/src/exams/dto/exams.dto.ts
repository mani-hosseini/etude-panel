import { Transform, Type } from 'class-transformer';
import {
  IsDefined,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ExamStatus } from '@prisma/client';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class AdminListExamsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ExamStatus })
  @IsOptional()
  @IsEnum(ExamStatus)
  status?: ExamStatus;
}

export class UpsertExamDto {
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsEnum(ExamStatus)
  status?: ExamStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class UploadOriginalNameDto {
  @ApiPropertyOptional({
    description: 'نام اصلی فایل که مرورگر می‌فرستد تا جایگزین نام ذخیره‌سازی نشود',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  originalName?: string;
}

export class UpsertExamGradeDto {
  @ApiProperty()
  @IsUUID()
  userId!: string;

  @ApiProperty({
    nullable: true,
    minimum: 0,
    maximum: 100,
    description: 'نمره از ۱۰۰؛ null یعنی پاک کردن نمره',
  })
  @IsDefined()
  @Transform(({ value }) => {
    if (value === null || value === '') return null;
    if (typeof value === 'string' && value.trim() === '') return null;
    return Number(value);
  })
  @ValidateIf((_, value) => value !== null)
  @IsNumber(
    { maxDecimalPlaces: 1 },
    { message: 'نمره باید عدد باشد و حداکثر یک رقم اعشار داشته باشد.' },
  )
  @Min(0, { message: 'نمره نمی‌تواند کمتر از ۰ باشد.' })
  @Max(100, { message: 'نمره نمی‌تواند بیشتر از ۱۰۰ باشد.' })
  score!: number | null;
}
