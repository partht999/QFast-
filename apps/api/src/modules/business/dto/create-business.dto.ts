import { IsBoolean, IsString, IsOptional, IsEmail, IsEnum, IsIn, IsInt, Min, Max, MinLength, MaxLength, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BusinessType } from '@prisma/client';

export class CreateBusinessDto {
  @ApiProperty({ example: 'The Bombay Canteen' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 'bombay-canteen', description: 'URL-friendly slug' })
  @IsString()
  @Matches(/^[a-z0-9-]+$/, { message: 'Slug can only contain lowercase letters, numbers, and hyphens' })
  @MinLength(3)
  @MaxLength(50)
  slug: string;

  @ApiPropertyOptional({ enum: BusinessType, default: BusinessType.RESTAURANT })
  @IsOptional()
  @IsEnum(BusinessType)
  type?: BusinessType;

  @ApiPropertyOptional({ example: '+919876543210' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'contact@bombaycanteen.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: 'Unit 1, Process House, Kamala Mills, Mumbai' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: 'Asia/Kolkata' })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({ enum: ['free', 'plus', 'pro'], default: 'free' })
  @IsOptional()
  @IsIn(['free', 'plus', 'pro'])
  plan?: 'free' | 'plus' | 'pro';

  @ApiPropertyOptional({ example: 2, description: 'Queues to open, or tables for a restaurant or cafe' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(40)
  counterCount?: number;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(180)
  averageWaitMinutes?: number;

  @ApiPropertyOptional({ description: 'Guests can join from their phone. Turn off for a counter-only line.' })
  @IsOptional()
  @IsBoolean()
  remoteJoinEnabled?: boolean;
}
