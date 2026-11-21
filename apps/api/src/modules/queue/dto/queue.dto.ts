import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class CreateQueueDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  department?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  doctorName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  serviceName?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(180)
  averageWaitMinutes?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(60)
  arrivalGraceMinutes?: number;
}

export class UpdateQueueDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  department?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  doctorName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  serviceName?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(180)
  averageWaitMinutes?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(60)
  arrivalGraceMinutes?: number;

  @IsOptional()
  @IsBoolean()
  remoteJoinEnabled?: boolean;
}

export class TableChoiceDto {
  @IsOptional()
  @IsString()
  tableId?: string;
}
