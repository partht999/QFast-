import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class StampActionDto {
  @IsString()
  @MinLength(5)
  @MaxLength(20)
  phone!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  name?: string;
}
