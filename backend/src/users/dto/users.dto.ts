import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
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
  @ApiPropertyOptional({
    description: 'فقط وضعیت فعال/غیرفعال؛ مشخصات پروفایل توسط هنرجو ویرایش می‌شود.',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
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
