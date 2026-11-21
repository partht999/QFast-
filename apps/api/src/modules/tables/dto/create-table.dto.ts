import { IsString, IsNotEmpty, IsInt, Min, Max, MaxLength, IsOptional } from 'class-validator';
import { ApiProperty, PartialType } from '@nestjs/swagger';

export class CreateTableDto {
  @ApiProperty({ example: 'Table 1' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  name: string;

  @ApiProperty({ example: 4, default: 4 })
  @IsInt()
  @Min(1)
  @Max(50)
  capacity: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  branchId?: string;
}

export class UpdateTableDto extends PartialType(CreateTableDto) {}
