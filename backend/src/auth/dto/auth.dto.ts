import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Match } from '../../common/decorators/match.decorator';

const PERSIAN_NAME = /^[\u0600-\u06FF\u200c\s]{2,40}$/;

export class LoginDto {
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
  @IsNotEmpty()
  @MinLength(6)
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

  @ApiProperty({ example: 'etudepiano123' })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;

  @ApiPropertyOptional({ example: 'ET-MC-1405-01' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  studentCode?: string;
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
