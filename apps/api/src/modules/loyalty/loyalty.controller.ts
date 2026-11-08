import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { LoyaltyService } from './loyalty.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateLoyaltyProgramDto } from './dto/update-loyalty-program.dto';
import { CreateLoyaltyRewardDto } from './dto/create-loyalty-reward.dto';
import { UpdateLoyaltyRewardDto } from './dto/update-loyalty-reward.dto';

@ApiTags('loyalty')
@Controller('loyalty')
export class LoyaltyController {
  constructor(private loyaltyService: LoyaltyService) {}

  @Get('public/:slug/offers')
  @ApiOperation({ summary: 'Get active loyalty rewards for restaurant customers' })
  async getPublicOffers(@Param('slug') slug: string) {
    return this.loyaltyService.getPublicOffers(slug);
  }

  @Get('public/:slug/:phone')
  @ApiOperation({ summary: 'Lookup diner loyalty balance & stamps' })
  async getCustomerBalance(
    @Param('slug') slug: string,
    @Param('phone') phone: string,
  ) {
    return this.loyaltyService.getCustomerBalance(slug, phone);
  }

  @Get('program/:businessId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get restaurant loyalty program configuration' })
  async getProgram(@Param('businessId') businessId: string, @Req() req: any) {
    return this.loyaltyService.getProgram(businessId, req.user.sub, req.user.role);
  }

  @Post('program/:businessId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Save loyalty program rules' })
  async updateProgram(
    @Param('businessId') businessId: string,
    @Body() data: UpdateLoyaltyProgramDto,
    @Req() req: any,
  ) {
    return this.loyaltyService.updateProgram(businessId, req.user.sub, req.user.role, data);
  }

  @Post('program/:businessId/rewards')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a loyalty reward offer' })
  async createReward(
    @Param('businessId') businessId: string,
    @Body() data: CreateLoyaltyRewardDto,
    @Req() req: any,
  ) {
    return this.loyaltyService.createReward(businessId, req.user.sub, req.user.role, data);
  }

  @Patch('program/:businessId/rewards/:rewardId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Activate or pause a loyalty reward offer' })
  async updateReward(
    @Param('businessId') businessId: string,
    @Param('rewardId') rewardId: string,
    @Body() data: UpdateLoyaltyRewardDto,
    @Req() req: any,
  ) {
    return this.loyaltyService.updateReward(
      businessId,
      rewardId,
      req.user.sub,
      req.user.role,
      data,
    );
  }

  @Delete('program/:businessId/rewards/:rewardId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a loyalty reward offer' })
  async deleteReward(
    @Param('businessId') businessId: string,
    @Param('rewardId') rewardId: string,
    @Req() req: any,
  ) {
    return this.loyaltyService.deleteReward(
      businessId,
      rewardId,
      req.user.sub,
      req.user.role,
    );
  }
}
