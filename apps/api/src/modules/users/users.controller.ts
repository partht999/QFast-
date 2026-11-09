import { Body, Controller, Get, Patch, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UsersService } from './users.service';
import { ChangePasswordDto } from './dto/change-password.dto';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile and business access' })
  async me(@Req() req: any) {
    return this.usersService.findById(req.user.sub);
  }

  @Patch('me/password')
  @ApiOperation({ summary: 'Change the signed-in account password' })
  async changePassword(@Body() dto: ChangePasswordDto, @Req() req: any) {
    return this.usersService.changePassword(req.user.sub, dto.currentPassword, dto.newPassword);
  }
}
