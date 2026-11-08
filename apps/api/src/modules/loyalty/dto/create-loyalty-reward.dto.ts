import { Transform } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateLoyaltyRewardDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name!: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(300)
  description?: string;

  @IsInt()
  @Min(1)
  @Max(1000000)
  pointsCost!: number;

  @IsIn(['DISCOUNT', 'FREE_ITEM', 'OTHER'])
  rewardType!: string;
}
