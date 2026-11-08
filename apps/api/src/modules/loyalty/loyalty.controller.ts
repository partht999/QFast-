import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { LoyaltyService } from './loyalty.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('loyalty')
@Controller('loyalty')
export class LoyaltyController {
  constructor(private loyaltyService: LoyaltyService) {}

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
  async getProgram(@Param('businessId') businessId: string) {
    return this.loyaltyService.getProgram(businessId);
  }

  @Post('program/:businessId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Save loyalty program rules' })
  async updateProgram(
    @Param('businessId') businessId: string,
    @Body() data: any,
  ) {
    return this.loyaltyService.updateProgram(businessId, data);
  }
}

