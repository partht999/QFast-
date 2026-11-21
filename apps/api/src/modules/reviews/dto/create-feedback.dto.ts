import {
  IsString,
  IsNotEmpty,
  IsInt,
  IsEnum,
  MaxLength,
  Min,
  Max,
  IsOptional,
  IsBoolean,
  IsArray,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { FeedbackStatus } from '@prisma/client';

export class UpdateFeedbackStatusDto {
  @ApiProperty({ enum: FeedbackStatus })
  @IsEnum(FeedbackStatus)
  status: FeedbackStatus;
}

export class CreateFeedbackDto {
  @ApiProperty({ example: 'olive-bistro' })
  @IsString()
  @IsNotEmpty()
  businessSlug: string;

  @ApiProperty({ example: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiProperty({ example: ['Great Food', 'Fast Service'], required: false })
  @IsArray()
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  @IsOptional()
  tags?: string[];

  @ApiProperty({ example: 'Loved the crispy crust pizza!', required: false })
  @IsString()
  @IsOptional()
  comment?: string;

  @ApiProperty({ example: false, default: false })
  @IsBoolean()
  @IsOptional()
  wantsContact?: boolean;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  orderId?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  customerPhone?: string;
}

export class UpdateGoogleSettingsDto {
  @ApiProperty({ example: 'ChIJN1t_tDeuEmsRUsoyG83frY4', required: false })
  @IsString()
  @IsOptional()
  googlePlaceId?: string;

  @ApiProperty({ example: 'https://g.page/r/Cb123/review', required: false })
  @IsString()
  @IsOptional()
  googleReviewUrl?: string;
}

