import { Controller, Post, Body, UseGuards, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RegisterDto } from './dto/register.dto';
import { RequestEmailOtpDto } from './dto/request-email-otp.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { JwtService } from '@nestjs/jwt';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private jwtService: JwtService,
  ) {}

  @Post('email/otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Email a 6-digit code to verify a business address' })
  async sendRegistrationOtp(@Body() dto: RequestEmailOtpDto) {
    return this.authService.sendRegistrationOtp(dto.email);
  }

  @Post('register')
  @ApiOperation({ summary: 'Register a new owner account' })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @UseGuards(LocalAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  async login(@Req() req: any, @Body() _dto: LoginDto) {
    return this.authService.login(req.user);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token using a refresh token' })
  async refresh(@Body() dto: RefreshDto) {
    const payload = this.jwtService.decode(dto.refreshToken) as any;
    if (!payload?.sub) {
      throw new Error('Invalid refresh token');
    }
    return this.authService.refreshTokens(payload.sub, dto.refreshToken);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout and revoke active refresh tokens' })
  async logout(@Req() req: any) {
    await this.authService.logout(req.user.sub);
    return { message: 'Logged out successfully' };
  }
}
