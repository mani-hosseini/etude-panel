import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class UpdateSessionProgressDto {
  @ApiProperty({
    example: 12,
    description: 'آخرین ایندکس اسلایدی که هنرجو دیده (از صفر)',
  })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  lastSlideIndex!: number;
}
