import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Max, Min } from 'class-validator';

export class UpdateSessionProgressDto {
  @ApiProperty({ example: 3, description: 'ایندکس آخرین اسلاید دیده‌شده (۰-based)' })
  @IsInt()
  @Min(0)
  @Max(500)
  lastSlideIndex!: number;
}
