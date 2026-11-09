import { IsEmail, IsString, Matches, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'owner@restaurant.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Password123!' })
  @IsString()
  @MinLength(8)
  @MaxLength(100)
  password: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @Matches(/^\d{6}$/, { message: 'Enter the 6-digit code from your email' })
  otp: string;
}
