import { IsString, IsNotEmpty, IsNumber, Min, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class JoinQueueDto {
  @ApiProperty({ example: 'Rahul Sharma' })
  @IsString()
  @IsNotEmpty()
  customerName: string;

  @ApiProperty({ example: '+919876543210' })
  @IsString()
  @IsNotEmpty()
  customerPhone: string;

  @ApiProperty({ example: 2, default: 1 })
  @IsNumber()
  @Min(1)
  partySize: number;

  @ApiProperty({ example: 'Window seating preferred', required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}

