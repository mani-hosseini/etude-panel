import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AttendanceStatus } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import {
  ASSIGNMENT_CATEGORIES,
  PIECE_CATEGORY,
} from '../assignment-categories';

export class CreateAssignmentDto {
  @ApiPropertyOptional({ description: 'slug یا uuid دوره' })
  @IsOptional()
  @IsString()
  courseId?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  studentIds?: string[];

  @ApiPropertyOptional({ description: 'uuid جلسه' })
  @IsOptional()
  @IsUUID()
  sessionId?: string;

  @ApiProperty({ example: 'تکنیک', enum: ASSIGNMENT_CATEGORIES })
  @IsString()
  @IsIn([...ASSIGNMENT_CATEGORIES], { message: 'محور تمرین نامعتبر است.' })
  category!: string;

  @ApiProperty({
    example: 'چرنی ۵۹۹',
    description: 'برای قطعه همان نام قطعه است که استاد در کادر می‌نویسد',
  })
  @IsString()
  @MinLength(2, { message: 'عنوان تمرین را وارد کنید.' })
  @MaxLength(200)
  title!: string;

  @ApiPropertyOptional({
    example: 'درس ۴',
    description: 'برای تکنیک، تئوری و سلفژ اجباری است؛ برای قطعه لازم نیست',
  })
  @ValidateIf((dto: CreateAssignmentDto) => dto.category !== PIECE_CATEGORY)
  @IsString()
  @MinLength(1, { message: 'منبع تمرین را وارد کنید، مثلاً درس ۴.' })
  @MaxLength(200)
  source?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;

  @ApiPropertyOptional({ example: 'کلاس بعد' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  dueLabel?: string;

  @ApiPropertyOptional({ example: 85, description: 'امتیاز اجرا از ۱۰۰' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  score?: number;

  @ApiPropertyOptional({
    description:
      'تکلیف روی جلسه بعد ذخیره شود؛ نمره اجرا در جلسه بعد ثبت می‌شود',
  })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  forNextSession?: boolean;
}

export class AssignmentItemDto {
  @ApiProperty({ example: 'تکنیک', enum: ASSIGNMENT_CATEGORIES })
  @IsString()
  @IsIn([...ASSIGNMENT_CATEGORIES], { message: 'محور تمرین نامعتبر است.' })
  category!: string;

  @ApiProperty({ example: 'چرنی ۵۹۹' })
  @IsString()
  @MinLength(2, { message: 'عنوان تمرین را وارد کنید.' })
  @MaxLength(200)
  title!: string;

  @ApiPropertyOptional({ example: 'درس ۴' })
  @ValidateIf((dto: AssignmentItemDto) => dto.category !== PIECE_CATEGORY)
  @IsString()
  @MinLength(1, { message: 'منبع تمرین را وارد کنید، مثلاً درس ۴.' })
  @MaxLength(200)
  source?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}

export class CreateAssignmentsBatchDto {
  @ApiPropertyOptional({ description: 'slug یا uuid دوره' })
  @IsOptional()
  @IsString()
  courseId?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  studentIds?: string[];

  @ApiPropertyOptional({ description: 'uuid جلسه' })
  @IsOptional()
  @IsUUID()
  sessionId?: string;

  @ApiPropertyOptional({ example: 'کلاس بعد' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  dueLabel?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  forNextSession?: boolean;

  @ApiProperty({ type: [AssignmentItemDto] })
  @IsArray()
  @ArrayMinSize(1, { message: 'حداقل یک تمرین را وارد کنید.' })
  @ArrayMaxSize(8)
  @ValidateNested({ each: true })
  @Type(() => AssignmentItemDto)
  items!: AssignmentItemDto[];
}

export class UpdateAssignmentProgressDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  progress?: number;

  @ApiPropertyOptional({ description: 'امتیاز اجرا از ۰ تا ۱۰۰' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  score?: number;
}

export class ScoreItemDto {
  @ApiProperty()
  @IsUUID()
  targetId!: string;

  @ApiProperty({ example: 100, minimum: 0, maximum: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  score!: number;
}

export class SaveScoresDto {
  @ApiProperty({ type: [ScoreItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(40)
  @ValidateNested({ each: true })
  @Type(() => ScoreItemDto)
  scores!: ScoreItemDto[];
}

export class SaveSessionWorkDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  studentId?: string;

  @ApiPropertyOptional({ enum: AttendanceStatus })
  @IsOptional()
  @Transform(({ value }) =>
    value == null || value === ''
      ? undefined
      : String(value).toUpperCase(),
  )
  @IsEnum(AttendanceStatus)
  attendance?: AttendanceStatus;

  @ApiPropertyOptional({ example: 'درس ۲ هانون' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  homeworkTitle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  homeworkSource?: string;

  @ApiPropertyOptional({ example: 'دست جدا، تمپو ۶۰' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  homeworkNote?: string;
}

export class TodayAttendanceMarkDto {
  @ApiProperty()
  @IsUUID()
  studentId!: string;

  @ApiProperty()
  @IsUUID()
  sessionId!: string;

  @ApiProperty({ enum: ['present', 'absent', 'PRESENT', 'ABSENT'] })
  @Transform(({ value }) =>
    value == null || value === ''
      ? undefined
      : String(value).toUpperCase(),
  )
  @IsIn([AttendanceStatus.PRESENT, AttendanceStatus.ABSENT])
  status!: AttendanceStatus;
}

export class MarkTodayAttendanceDto {
  @ApiProperty({ type: [TodayAttendanceMarkDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(80)
  @ValidateNested({ each: true })
  @Type(() => TodayAttendanceMarkDto)
  marks!: TodayAttendanceMarkDto[];
}

export class UpsertAttendanceDto {
  @ApiProperty()
  @IsString()
  courseId!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(80)
  meetingKey!: string;

  @ApiProperty()
  @IsUUID()
  studentId!: string;

  @ApiProperty({ enum: AttendanceStatus })
  @Transform(({ value }) => String(value ?? '').toUpperCase())
  @IsEnum(AttendanceStatus)
  status!: AttendanceStatus;
}

export class UpdateStudentStarsDto {
  @ApiProperty({ example: 4, minimum: 0, maximum: 6 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(6)
  stars!: number;
}

export class UpdateStudentLevelDto {
  @ApiProperty({ example: 3, minimum: 1, maximum: 10 })
  @Type(() => Number)
  @IsInt()
  @Min(1, { message: 'سطح باید بین ۱ تا ۱۰ باشد.' })
  @Max(10, { message: 'سطح باید بین ۱ تا ۱۰ باشد.' })
  level!: number;
}

export class UpdateTeacherProfileDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  instrument?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  room?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  bio?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(32)
  phone?: string;
}

export class PracticeSeriesQueryDto {
  @ApiPropertyOptional({ enum: ['7d', '30d', '90d'] })
  @IsOptional()
  @IsIn(['7d', '30d', '90d'])
  range?: '7d' | '30d' | '90d';
}

export class CreatePracticeLogDto {
  @ApiPropertyOptional({ example: '2026-10-24' })
  @IsOptional()
  @IsString()
  date?: string;

  @ApiProperty({ example: 45 })
  @Type(() => Number)
  @IsInt()
  @Min(5)
  @Max(300)
  minutes!: number;
}
