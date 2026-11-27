import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CalendarCoverage, CalendarOccasionKind } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class CalendarDayQueryDto {
  @ApiPropertyOptional({ description: 'سال شمسی' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1300)
  @Max(1500)
  year?: number;

  @ApiPropertyOptional({ description: 'ماه شمسی' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month?: number;

  @ApiPropertyOptional({ description: 'روز شمسی' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(31)
  day?: number;
}

export class CalendarMonthQueryDto {
  @ApiProperty({ example: 1405 })
  @Type(() => Number)
  @IsInt()
  @Min(1300)
  @Max(1500)
  year!: number;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month!: number;
}

export class UpsertOccasionDto {
  @ApiProperty({ example: 1405 })
  @Type(() => Number)
  @IsInt()
  @Min(1300)
  @Max(1500)
  year!: number;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month!: number;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(31)
  day!: number;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(300)
  title!: string;

  @ApiProperty({ enum: CalendarOccasionKind })
  @IsEnum(CalendarOccasionKind)
  kind!: CalendarOccasionKind;

  @ApiProperty()
  @IsBoolean()
  isOfficialHoliday!: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  source?: string;
}

export class ImportOccasionItemDto {
  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month!: number;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(31)
  day!: number;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(300)
  title!: string;

  @ApiProperty({ enum: CalendarOccasionKind })
  @IsEnum(CalendarOccasionKind)
  kind!: CalendarOccasionKind;

  @ApiProperty()
  @IsBoolean()
  isOfficialHoliday!: boolean;
}

export class ImportCalendarYearDto {
  @ApiProperty({ example: 1405 })
  @Type(() => Number)
  @IsInt()
  @Min(1300)
  @Max(1500)
  year!: number;

  @ApiProperty({ enum: CalendarCoverage })
  @IsEnum(CalendarCoverage)
  coverage!: CalendarCoverage;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(300)
  source!: string;

  @ApiProperty({ type: [ImportOccasionItemDto] })
  @ValidateNested({ each: true })
  @Type(() => ImportOccasionItemDto)
  @ArrayMaxSize(400)
  occasions!: ImportOccasionItemDto[];
}
