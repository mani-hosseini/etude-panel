import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class ListUsersQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: Role })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @ApiPropertyOptional({ description: 'true | false' })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return undefined;
  })
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateUserDto {
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

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional({ example: 'پایه' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  level?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 'ET-1405-ABCD' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  studentCode?: string;

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

  @ApiPropertyOptional({ description: 'رمز عبور جدید' })
  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password?: string;
}

export class ResetPasswordDto {
  @ApiProperty({ example: 'NewPass123!' })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;
}

export class EnrollCourseDto {
  @ApiProperty({ description: 'slug یا uuid دوره', example: 'theory-basics' })
  @IsString()
  @IsNotEmpty()
  courseId!: string;
}
