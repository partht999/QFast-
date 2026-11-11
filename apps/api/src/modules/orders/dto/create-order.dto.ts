import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsArray,
  ValidateNested,
  IsNumber,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { OrderSource, PaymentMethod } from '@prisma/client';

export class OrderItemDto {
  @ApiProperty({ example: 'item_123' })
  @IsString()
  @IsNotEmpty()
  menuItemId: string;

  @ApiProperty({ example: 2 })
  @IsInt()
  @Min(1)
  @Max(50)
  quantity: number;

  @ApiProperty({ example: 280 })
  @IsNumber()
  @Min(0)
  unitPrice: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  variantId?: string;

  @ApiProperty({ required: false, type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  addonIds?: string[];

  @ApiProperty({ example: 'Less spicy please', required: false })
  @IsString()
  @IsOptional()
  specialNote?: string;
}

export class CreateOrderDto {
  @ApiProperty({ example: 'olive-bistro' })
  @IsString()
  @IsNotEmpty()
  businessSlug: string;

  @ApiProperty({ enum: OrderSource, default: OrderSource.TABLE_QR })
  @IsEnum(OrderSource)
  source: OrderSource;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  queueTokenId?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  tableId?: string;

  @ApiProperty({ example: 'Table 4', required: false })
  @IsString()
  @IsOptional()
  tableName?: string;

  @ApiProperty({ example: 'Aarav Gupta', required: false })
  @IsString()
  @IsOptional()
  customerName?: string;

  @ApiProperty({ example: '+919876543210', required: false })
  @IsString()
  @IsOptional()
  customerPhone?: string;

  @ApiProperty({ example: 'Please provide extra napkins', required: false })
  @IsString()
  @IsOptional()
  specialInstructions?: string;

  @ApiProperty({ required: false })
  @IsNumber()
  @Min(0)
  @IsOptional()
  tipAmount?: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  idempotencyKey?: string;

  @ApiProperty({ enum: PaymentMethod, default: PaymentMethod.UPI_AT_COUNTER })
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @ApiProperty({ type: [OrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];
}

