import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class SessionsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'slug یا id دوره' })
  @IsOptional()
  @IsString()
  courseId?: string;
}

export class CourseScopedQueryDto {
  @ApiPropertyOptional({ description: 'slug یا id دوره' })
  @IsOptional()
  @IsString()
  courseId?: string;
}
