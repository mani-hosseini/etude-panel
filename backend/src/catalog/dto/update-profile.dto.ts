import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { Match } from '../../common/decorators/match.decorator';

const PERSIAN_NAME = /^[\u0600-\u06FF\u200c\s]{2,40}$/;

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'آوا' })
  @IsOptional()
  @IsString()
  @Matches(PERSIAN_NAME, {
    message: 'نام باید فارسی و بین ۲ تا ۴۰ کاراکتر باشد.',
  })
  firstName?: string;

  @ApiPropertyOptional({ example: 'محمدی' })
  @IsOptional()
  @IsString()
  @Matches(PERSIAN_NAME, {
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
  @MaxLength(16)
  phone?: string;

  @ApiPropertyOptional({ example: '0012345678' })
  @IsOptional()
  @IsString()
  @MaxLength(16)
  nationalId?: string;

  @ApiPropertyOptional({ example: 'تهران، خیابان ولیعصر' })
  @IsOptional()
  @IsString()
  @MaxLength(400)
  address?: string;

  @ApiPropertyOptional({ example: 'etudepiano123' })
  @IsOptional()
  @IsString()
  @MinLength(8, { message: 'رمز عبور حداقل ۸ کاراکتر باشد.' })
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).+$/, {
    message: 'رمز عبور باید شامل حروف و اعداد باشد.',
  })
  @MaxLength(128)
  password?: string;

  @ApiPropertyOptional({ example: 'etudepiano123' })
  @ValidateIf((o: UpdateProfileDto) => Boolean(o.password))
  @IsString()
  @MinLength(8)
  @Match('password', { message: 'تکرار رمز عبور مطابقت ندارد.' })
  confirmPassword?: string;
}
