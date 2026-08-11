import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'آوا' })
  @IsOptional()
  @IsString()
  @Matches(/^[\u0600-\u06FF\u200c\s]{2,40}$/, {
    message: 'نام باید فارسی و بین ۲ تا ۴۰ کاراکتر باشد.',
  })
  firstName?: string;

  @ApiPropertyOptional({ example: 'محمدی' })
  @IsOptional()
  @IsString()
  @Matches(/^[\u0600-\u06FF\u200c\s]{2,40}$/, {
    message: 'نام خانوادگی باید فارسی و بین ۲ تا ۴۰ کاراکتر باشد.',
  })
  lastName?: string;

  @ApiPropertyOptional({ example: 'پایه' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  level?: string;

  @ApiPropertyOptional({ example: '09121234567' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  phone?: string;

  @ApiPropertyOptional({ example: '0012345678' })
  @IsOptional()
  @IsString()
  @MaxLength(16)
  nationalId?: string;

  @ApiPropertyOptional({ example: 'تهران، خیابان ولیعصر' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @ApiPropertyOptional({ description: 'رمز عبور جدید (اختیاری)' })
  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password?: string;
}
