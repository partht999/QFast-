import { IsString, IsNotEmpty, IsNumber, Min, Max, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { QueueEntrySource } from '@prisma/client';

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
  @Max(20)
  partySize: number;

  @ApiProperty({ example: 'Window seating preferred', required: false })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({ enum: QueueEntrySource, required: false, default: QueueEntrySource.REMOTE })
  @IsEnum(QueueEntrySource)
  @IsOptional()
  source?: QueueEntrySource;

  @ApiProperty({ example: 'queue_123', required: false })
  @IsString()
  @IsOptional()
  queueId?: string;

  @ApiProperty({ example: 'Dr. Sarah Smith', required: false })
  @IsString()
  @IsOptional()
  doctorName?: string;

  @ApiProperty({ example: 'General Consultation', required: false })
  @IsString()
  @IsOptional()
  serviceName?: string;
}
