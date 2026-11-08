import { IsString, IsNotEmpty, IsNumber, Min, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTableDto {
  @ApiProperty({ example: 'Table 1' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 4, default: 4 })
  @IsNumber()
  @Min(1)
  capacity: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  branchId?: string;
}

