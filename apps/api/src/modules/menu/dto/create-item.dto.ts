import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateMenuItemDto {
  @ApiProperty({ example: 'cat_123' })
  @IsString()
  @IsNotEmpty()
  categoryId: string;

  @ApiProperty({ example: 'Paneer Tikka' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 280 })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({ example: 'Cottage cheese cubes marinated in spiced yogurt', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: true, default: true })
  @IsBoolean()
  @IsOptional()
  isVeg?: boolean;

  @ApiProperty({ example: 15, required: false })
  @IsNumber()
  @IsOptional()
  prepTimeMinutes?: number;

  @ApiProperty({ example: 'https://images.unsplash.com/...', required: false })
  @IsString()
  @IsOptional()
  imageUrl?: string;
}

export class UpdateMenuItemDto {
  @ApiProperty({ example: 'Paneer Tikka', required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ example: 290, required: false })
  @IsNumber()
  @IsOptional()
  price?: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  isVeg?: boolean;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  isAvailable?: boolean;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  prepTimeMinutes?: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  imageUrl?: string;
}

