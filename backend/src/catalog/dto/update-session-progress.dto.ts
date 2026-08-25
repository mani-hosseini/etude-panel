import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Max, Min } from 'class-validator';

export class UpdateSessionProgressDto {
  @ApiProperty({
    example: 3,
    description:
      'ایندکس دورترین اسلاید دیده‌شده (۰-based). عقب‌گرد ذخیره نمی‌شود.',
  })
  @IsInt()
  @Min(0)
  @Max(500)
  lastSlideIndex!: number;
}
