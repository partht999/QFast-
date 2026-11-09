import { IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'clinicdesk' })
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  @Matches(/^[a-zA-Z0-9][a-zA-Z0-9._@+-]*$/, {
    message: 'Username can use letters, numbers, and . _ @ + -',
  })
  username: string;

  @ApiProperty({ example: 'Password123!' })
  @IsString()
  password: string;
}
