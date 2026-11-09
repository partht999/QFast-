import { IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RequestEmailOtpDto {
  @ApiProperty({ example: 'owner@clinic.com' })
  @IsEmail()
  email: string;
}
