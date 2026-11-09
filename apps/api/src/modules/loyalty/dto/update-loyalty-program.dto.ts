import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
import { LoyaltyProgramType } from '@prisma/client';

export class UpdateLoyaltyProgramDto {
  @IsOptional()
  @IsEnum(LoyaltyProgramType)
  type?: LoyaltyProgramType;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(100)
  pointsPerRupee?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(3650)
  expiryDays?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2)
  @Max(20)
  stampsForReward?: number;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  rewardName?: string;
}
