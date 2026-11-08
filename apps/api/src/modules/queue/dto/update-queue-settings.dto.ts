import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateQueueSettingsDto {
  @ApiPropertyOptional({ minimum: 1, maximum: 60, example: 8 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(60)
  averageWaitMinutes?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 60, example: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(60)
  arrivalGraceMinutes?: number;
}
