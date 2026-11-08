import { IsBoolean } from 'class-validator';

export class UpdateLoyaltyRewardDto {
  @IsBoolean()
  isActive!: boolean;
}
