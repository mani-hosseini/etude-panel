import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { Match } from '../../common/decorators/match.decorator';
import { normalizeNationalId } from '../../common/utils/mappers';

const PERSIAN_NAME = /^[\u0600-\u06FF\u200c\s]{2,40}$/;
const NATIONAL_ID = /^\d{8,16}$/;

function emptyToUndefined(value: unknown) {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

export class LoginDto {
  @ApiPropertyOptional({
    example: '0203599748',
    description: 'ورود هنرجوی پیانو با کد ملی',
  })
  @Transform(({ value }) =>
    typeof value === 'string' ? normalizeNationalId(value) || undefined : value,
  )
  @IsOptional()
  @IsString()
  @Matches(NATIONAL_ID, {
    message: 'نام کاربری همان کد ملی هنرجو است.',
  })
  username?: string;

  @ApiPropertyOptional({
    example: 'آوا',
    description: 'ورود مسترکلاس تئوری با نام فارسی',
  })
  @Transform(({ value }) => emptyToUndefined(value))
  @ValidateIf((dto: LoginDto) => !dto.username)
  @IsString()
  @IsNotEmpty()
  @Matches(PERSIAN_NAME, {
    message: 'نام باید فارسی و بین ۲ تا ۴۰ کاراکتر باشد.',
  })
  firstName?: string;

  @ApiPropertyOptional({
    example: 'محمدی',
    description: 'ورود مسترکلاس تئوری با نام خانوادگی فارسی',
  })
  @Transform(({ value }) => emptyToUndefined(value))
  @ValidateIf((dto: LoginDto) => !dto.username)
  @IsString()
  @IsNotEmpty()
  @Matches(PERSIAN_NAME, {
    message: 'نام خانوادگی باید فارسی و بین ۲ تا ۴۰ کاراکتر باشد.',
  })
  lastName?: string;

  @ApiProperty({ example: 'etudepiano123' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6, { message: 'رمز عبور را وارد کنید.' })
  @MaxLength(128)
  password!: string;
}

export class RegisterDto {
  @ApiProperty({ example: 'آوا' })
  @IsString()
  @IsNotEmpty()
  @Matches(PERSIAN_NAME, {
    message: 'نام باید فارسی و بین ۲ تا ۴۰ کاراکتر باشد.',
  })
  firstName!: string;

  @ApiProperty({ example: 'محمدی' })
  @IsString()
  @IsNotEmpty()
  @Matches(PERSIAN_NAME, {
    message: 'نام خانوادگی باید فارسی و بین ۲ تا ۴۰ کاراکتر باشد.',
  })
  lastName!: string;

  @ApiProperty({ example: 'etudepiano123' })
  @IsString()
  @MinLength(8, { message: 'رمز عبور حداقل ۸ کاراکتر باشد.' })
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).+$/, {
    message: 'رمز عبور باید شامل حروف و اعداد باشد.',
  })
  @MaxLength(128)
  password!: string;

  @ApiProperty({ example: 'etudepiano123' })
  @IsString()
  @MinLength(8)
  @Match('password', { message: 'تکرار رمز عبور مطابقت ندارد.' })
  confirmPassword!: string;
}

/** ثبت هنرجو توسط ادمین */
export class RegisterStudentDto {
  @ApiProperty({ example: 'آوا' })
  @IsString()
  @IsNotEmpty()
  @Matches(PERSIAN_NAME, {
    message: 'نام باید فارسی و بین ۲ تا ۴۰ کاراکتر باشد.',
  })
  firstName!: string;

  @ApiProperty({ example: 'محمدی' })
  @IsString()
  @IsNotEmpty()
  @Matches(PERSIAN_NAME, {
    message: 'نام خانوادگی باید فارسی و بین ۲ تا ۴۰ کاراکتر باشد.',
  })
  lastName!: string;

  @ApiProperty({ example: '0203599748', description: 'کد ملی = نام کاربری و رمز عبور' })
  @Transform(({ value }) =>
    typeof value === 'string' ? normalizeNationalId(value) : value,
  )
  @IsString()
  @IsNotEmpty()
  @Matches(NATIONAL_ID, {
    message: 'کد ملی را درست وارد کنید.',
  })
  nationalId!: string;

  @ApiPropertyOptional({
    example: '0203599748',
    description: 'اگر خالی باشد همان کد ملی به‌عنوان رمز استفاده می‌شود',
  })
  @IsOptional()
  @IsString()
  @MinLength(8, { message: 'رمز عبور حداقل ۸ کاراکتر باشد.' })
  @MaxLength(128)
  password?: string;

  @ApiPropertyOptional({ example: 'ET-MC-1405-01' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  studentCode?: string;

  @ApiPropertyOptional({ example: '1', description: 'سطح هنرجو از ۱ تا ۱۰' })
  @IsOptional()
  @IsIn(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'], {
    message: 'سطح باید بین ۱ تا ۱۰ باشد.',
  })
  level?: string;
}

/** ثبت استاد توسط ادمین */
export class RegisterTeacherDto {
  @ApiProperty({ example: 'مانی' })
  @IsString()
  @IsNotEmpty()
  @Matches(PERSIAN_NAME, {
    message: 'نام باید فارسی و بین ۲ تا ۴۰ کاراکتر باشد.',
  })
  firstName!: string;

  @ApiProperty({ example: 'نیما' })
  @IsString()
  @IsNotEmpty()
  @Matches(PERSIAN_NAME, {
    message: 'نام خانوادگی باید فارسی و بین ۲ تا ۴۰ کاراکتر باشد.',
  })
  lastName!: string;

  @ApiProperty({ example: '0441313620', description: 'کد ملی = نام کاربری و رمز عبور' })
  @Transform(({ value }) =>
    typeof value === 'string' ? normalizeNationalId(value) : value,
  )
  @IsString()
  @IsNotEmpty()
  @Matches(NATIONAL_ID, {
    message: 'کد ملی را درست وارد کنید.',
  })
  nationalId!: string;

  @ApiPropertyOptional({
    example: '0441313620',
    description: 'اگر خالی باشد همان کد ملی به‌عنوان رمز استفاده می‌شود',
  })
  @IsOptional()
  @IsString()
  @MinLength(8, { message: 'رمز عبور حداقل ۸ کاراکتر باشد.' })
  @MaxLength(128)
  password?: string;

  @ApiPropertyOptional({ example: 'استاد پیانو' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string;

  @ApiPropertyOptional({ example: 'پیانو' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  instrument?: string;

  @ApiPropertyOptional({ example: 'استودیو ۳' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  room?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  bio?: string;

  @ApiPropertyOptional({ example: '09121234567' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  phone?: string;
}

export class RefreshTokenDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  refreshToken?: string;
}

export class AdminLoginDto {
  @ApiProperty({ example: 'admin@etude.academy' })
  @IsString()
  @IsNotEmpty()
  email!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password!: string;
}
