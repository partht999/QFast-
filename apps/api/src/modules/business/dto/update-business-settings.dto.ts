import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class UpdateBusinessSettingsDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  googlePlaceId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(180)
  averageWaitMinutes?: number;

  @IsOptional()
  @IsBoolean()
  isOpen?: boolean;

  @IsOptional()
  @IsBoolean()
  remoteJoinEnabled?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500000)
  logoUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  instagramHandle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  gstin?: string;
}
