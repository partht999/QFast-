import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { CreateFeedbackDto, UpdateFeedbackStatusDto, UpdateGoogleSettingsDto } from './dto/create-feedback.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';

@ApiTags('reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private reviewsService: ReviewsService) {}

  @Post('feedback')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Submit diner rating and private feedback' })
  async submitFeedback(@Body() dto: CreateFeedbackDto) {
    return this.reviewsService.submitFeedback(dto);
  }

  @Get(':businessId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List customer feedback inbox for dashboard' })
  async getBusinessFeedback(@Param('businessId') businessId: string, @Req() req: any) {
    return this.reviewsService.getBusinessFeedback(businessId, req.user.sub);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update feedback resolution status' })
  async updateStatus(
    @Param('id') id: string,
    @Body() body: UpdateFeedbackStatusDto,
    @Req() req: any,
  ) {
    return this.reviewsService.updateFeedbackStatus(id, body.status, req.user.sub);
  }

  @Patch(':businessId/google-settings')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Configure Google Place ID & review URL' })
  async updateGoogleSettings(
    @Param('businessId') businessId: string,
    @Body() dto: UpdateGoogleSettingsDto,
    @Req() req: any,
  ) {
    return this.reviewsService.updateGoogleSettings(businessId, dto, req.user.sub);
  }
}

