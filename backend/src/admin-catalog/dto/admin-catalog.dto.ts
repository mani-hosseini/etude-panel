import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  CourseStatus,
  LessonStatus,
  LessonType,
  SessionStatus,
  SlideKind,
} from '@prisma/client';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class AdminListCoursesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: CourseStatus })
  @IsOptional()
  @IsEnum(CourseStatus)
  status?: CourseStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}

export class UpsertCourseDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  slug?: string;

  @IsString()
  @MaxLength(200)
  title!: string;

  @IsString()
  @MaxLength(300)
  subtitle!: string;

  @IsString()
  @MaxLength(64)
  instrument!: string;

  @IsString()
  @MaxLength(120)
  teacher!: string;

  @IsString()
  @MaxLength(80)
  teacherShort!: string;

  @IsString()
  @MaxLength(32)
  day!: string;

  @IsString()
  @MaxLength(64)
  time!: string;

  @IsString()
  @MaxLength(32)
  timeShort!: string;

  @IsString()
  @MaxLength(32)
  duration!: string;

  @IsString()
  @MaxLength(120)
  room!: string;

  @ApiPropertyOptional({ example: 'مقدماتی', description: 'اختیاری' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  level?: string;

  @IsString()
  @MaxLength(300)
  focus!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  sessionsTotal!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  weeklyHours?: number;

  @IsOptional()
  @IsEnum(CourseStatus)
  status?: CourseStatus;

  @IsOptional()
  @IsBoolean()
  certificateReady?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  accessNote?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;
}

export class UpsertSessionDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  number?: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  summary?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  topics?: string[];

  @IsOptional()
  @IsEnum(SessionStatus)
  status?: SessionStatus;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  durationLabel?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  dateLabel?: string;
}

export class CreateSessionDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  number!: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  summary?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  topics?: string[];

  @IsOptional()
  @IsEnum(SessionStatus)
  status?: SessionStatus;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  durationLabel?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  dateLabel?: string;
}

export class SlideTermDto {
  @IsString()
  en!: string;

  @IsString()
  fa!: string;
}

export class UpsertSlideDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  sourceId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  sortOrder?: number;

  @IsOptional()
  @IsString()
  @MaxLength(16)
  chapter?: string;

  @IsOptional()
  @IsString()
  @MaxLength(400)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  goal?: string;

  @IsOptional()
  @IsString()
  body?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  bullets?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SlideTermDto)
  terms?: SlideTermDto[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  mistakes?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  imageHint?: string;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  imageId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  funFact?: string;

  @IsOptional()
  @IsEnum(SlideKind)
  kind?: SlideKind;
}

export class CreateSlideDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  sourceId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  sortOrder?: number;

  @IsString()
  @MaxLength(16)
  chapter!: string;

  @IsString()
  @MaxLength(400)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  goal?: string;

  @IsString()
  body!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  bullets?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SlideTermDto)
  terms?: SlideTermDto[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  mistakes?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  imageHint?: string;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  imageId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  funFact?: string;

  @IsOptional()
  @IsEnum(SlideKind)
  kind?: SlideKind;
}

export class ReorderSlidesDto {
  @IsArray()
  @IsUUID('4', { each: true })
  slideIds!: string[];
}

export class UpsertScheduleDto {
  @IsOptional()
  @IsUUID()
  sessionId?: string | null;

  @IsString()
  @MaxLength(300)
  title!: string;

  @IsString()
  @MaxLength(120)
  teacher!: string;

  @IsString()
  @MaxLength(32)
  day!: string;

  @IsString()
  @MaxLength(64)
  dateLabel!: string;

  @IsString()
  @MaxLength(64)
  time!: string;

  @IsString()
  @MaxLength(120)
  room!: string;

  @IsOptional()
  @IsEnum(LessonType)
  type?: LessonType;

  @IsString()
  @MaxLength(32)
  duration!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  @IsOptional()
  @IsEnum(LessonStatus)
  status?: LessonStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;
}

export class UpsertPracticeTipDto {
  @IsString()
  @MaxLength(500)
  text!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;
}
