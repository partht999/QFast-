import { IsString, IsNotEmpty, IsNumber, Min, Max, IsOptional, IsEnum, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { QueueEntrySource } from '@prisma/client';

export class JoinQueueDto {
  @ApiProperty({ example: 'Rahul Sharma' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  customerName: string;

  @ApiProperty({ example: '+919876543210' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  customerPhone: string;

  @ApiProperty({ example: 2, default: 1 })
  @IsNumber()
  @Min(1)
  @Max(20)
  partySize: number;

  @ApiProperty({ example: 'Window seating preferred', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(300)
  notes?: string;

  @ApiProperty({ enum: QueueEntrySource, required: false, default: QueueEntrySource.REMOTE })
  @IsEnum(QueueEntrySource)
  @IsOptional()
  source?: QueueEntrySource;

  @ApiProperty({ example: 'queue_123', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(40)
  queueId?: string;

  @ApiProperty({ example: 'Dr. Sarah Smith', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(80)
  doctorName?: string;

  @ApiProperty({ example: 'General Consultation', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(80)
  serviceName?: string;
}
