import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class SessionsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'slug یا id دوره' })
  @IsOptional()
  @IsString()
  courseId?: string;

  @ApiPropertyOptional({ example: 1, description: 'شماره ترم هنرجو' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  term?: number;
}

export class CourseScopedQueryDto {
  @ApiPropertyOptional({ description: 'slug یا id دوره' })
  @IsOptional()
  @IsString()
  courseId?: string;

  @ApiPropertyOptional({ example: 1, description: 'شماره ترم هنرجو' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  term?: number;
}
