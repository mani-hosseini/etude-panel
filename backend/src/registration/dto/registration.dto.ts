import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

export const LEAD_STATUSES = [
  'consulting',
  'deciding',
  'enrolled',
  'lost',
] as const;
export type LeadStatusDto = (typeof LEAD_STATUSES)[number];

export const REFERRAL_SOURCES = [
  'instagram',
  'google',
  'student_referral',
  'friend_family',
  'ads',
  'website',
  'inbound_call',
  'walk_in',
  'other',
] as const;
export type ReferralSourceDto = (typeof REFERRAL_SOURCES)[number];

export const COURSE_INTERESTS = [
  'piano',
  'theory',
  'both',
  'undecided',
] as const;
export type CourseInterestDto = (typeof COURSE_INTERESTS)[number];

export const TIME_PREFERENCES = ['morning', 'evening', 'flexible'] as const;
export type TimePreferenceDto = (typeof TIME_PREFERENCES)[number];

export const TASK_STATUSES = ['open', 'done'] as const;
export type TaskStatusDto = (typeof TASK_STATUSES)[number];

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function emptyToUndefined(value: unknown) {
  if (value == null) return undefined;
  if (typeof value === 'string' && value.trim() === '') return undefined;
  return value;
}

export class UpsertLeadDto {
  @ApiProperty({ example: '2026-11-06' })
  @IsOptional()
  @Matches(ISO_DATE, { message: 'تاریخ تماس نامعتبر است.' })
  contactDate?: string;

  @ApiProperty({ example: 'آوا' })
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'نام را بنویس.' })
  @MaxLength(40)
  firstName?: string;

  @ApiProperty({ example: 'محمدی' })
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'نام خانوادگی را بنویس.' })
  @MaxLength(40)
  lastName?: string;

  @ApiProperty({ example: '09121234567' })
  @IsOptional()
  @IsString()
  @Matches(/^[0-9+]{8,15}$/, { message: 'شماره تماس نامعتبر است.' })
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(32)
  secondaryPhone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  parentName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(8)
  age?: string;

  @ApiProperty({ example: '2' })
  @IsOptional()
  @IsString()
  @MaxLength(16)
  district?: string;

  @ApiPropertyOptional({ enum: REFERRAL_SOURCES })
  @IsOptional()
  @IsIn(REFERRAL_SOURCES)
  referralSource?: ReferralSourceDto;

  @ApiPropertyOptional({ enum: LEAD_STATUSES })
  @IsOptional()
  @IsIn(LEAD_STATUSES)
  status?: LeadStatusDto;

  @ApiPropertyOptional({ enum: COURSE_INTERESTS })
  @IsOptional()
  @IsIn(COURSE_INTERESTS)
  interest?: CourseInterestDto;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(7)
  @IsString({ each: true })
  preferredDays?: string[];

  @ApiPropertyOptional({ enum: TIME_PREFERENCES })
  @IsOptional()
  @IsIn(TIME_PREFERENCES)
  timePreference?: TimePreferenceDto;

  @ApiPropertyOptional({ example: '2026-11-07', nullable: true })
  @IsOptional()
  @Transform(({ value }) => emptyToUndefined(value) ?? null)
  @ValidateIf((_, value) => value != null)
  @Matches(ISO_DATE, { message: 'تاریخ پیگیری نامعتبر است.' })
  followUpDate?: string | null;
}

export class CreateLeadDto extends UpsertLeadDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  declare firstName: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  declare lastName: string;

  @ApiProperty()
  @IsString()
  @Matches(/^[0-9+]{8,15}$/, { message: 'شماره تماس نامعتبر است.' })
  declare phone: string;

  @ApiProperty()
  @IsString()
  @MaxLength(16)
  declare district: string;

  @ApiProperty()
  @Matches(ISO_DATE, { message: 'تاریخ تماس نامعتبر است.' })
  declare contactDate: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}

export class CreateLeadNoteDto {
  @ApiProperty()
  @IsString()
  @MinLength(1, { message: 'نوت خالی است.' })
  @MaxLength(2000)
  text!: string;
}

export class CreateTaskDto {
  @ApiProperty()
  @IsString()
  @MinLength(1, { message: 'عنوان تسک را بنویس.' })
  @MaxLength(200)
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  body?: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @Transform(({ value }) => emptyToUndefined(value) ?? null)
  @ValidateIf((_, value) => value != null)
  @Matches(ISO_DATE, { message: 'مهلت نامعتبر است.' })
  dueDate?: string | null;
}

export class UpdateTaskDto {
  @ApiPropertyOptional({ enum: TASK_STATUSES })
  @IsOptional()
  @IsIn(TASK_STATUSES)
  status?: TaskStatusDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  body?: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @Transform(({ value }) => emptyToUndefined(value) ?? null)
  @ValidateIf((_, value) => value != null)
  @Matches(ISO_DATE, { message: 'مهلت نامعتبر است.' })
  dueDate?: string | null;
}
