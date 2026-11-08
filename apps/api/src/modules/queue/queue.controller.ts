import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { QueueService } from './queue.service';
import { JoinQueueDto } from './dto/join-queue.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { QueueTokenStatus } from '@prisma/client';

@ApiTags('queue')
@Controller('queue')
export class QueueController {
  constructor(private queueService: QueueService) {}

  // ── Public Customer Endpoints ──────────────────────────────────────────────

  @Get('public/:slug/status')
  @ApiOperation({ summary: 'Get current queue status by restaurant slug' })
  async getStatus(@Param('slug') slug: string) {
    return this.queueService.getStatusBySlug(slug);
  }

  @Post('public/:slug/join')
  @ApiOperation({ summary: 'Customer joins queue via entrance QR' })
  async joinQueue(@Param('slug') slug: string, @Body() dto: JoinQueueDto) {
    return this.queueService.joinQueue(slug, dto);
  }

  @Get('public/token/:tokenId')
  @ApiOperation({ summary: 'Track a specific queue token in real-time' })
  async getToken(@Param('tokenId') tokenId: string) {
    return this.queueService.getToken(tokenId);
  }

  @Post('public/token/:tokenId/cancel')
  @ApiOperation({ summary: 'Customer cancels their queue token' })
  async cancelToken(@Param('tokenId') tokenId: string) {
    return this.queueService.cancelToken(tokenId);
  }

  // ── Staff & Management Endpoints ───────────────────────────────────────────

  @Get('manage/:businessId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all queue tokens for business management' })
  async getBusinessTokens(@Param('businessId') businessId: string) {
    return this.queueService.getBusinessTokens(businessId);
  }

  @Patch('manage/token/:tokenId/call')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Call the guest forward' })
  async callToken(@Param('tokenId') tokenId: string) {
    return this.queueService.updateTokenStatus(tokenId, QueueTokenStatus.CALLED);
  }

  @Patch('manage/token/:tokenId/seat')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Seat the guest at a table' })
  async seatToken(@Param('tokenId') tokenId: string) {
    return this.queueService.updateTokenStatus(tokenId, QueueTokenStatus.SEATED);
  }

  @Patch('manage/token/:tokenId/skip')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark token as skipped' })
  async skipToken(@Param('tokenId') tokenId: string) {
    return this.queueService.updateTokenStatus(tokenId, QueueTokenStatus.SKIPPED);
  }

  @Patch('manage/token/:tokenId/cancel')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel or no-show token' })
  async staffCancelToken(@Param('tokenId') tokenId: string) {
    return this.queueService.updateTokenStatus(tokenId, QueueTokenStatus.CANCELLED);
  }

  @Patch('manage/queue/:queueId/toggle')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Toggle queue open/closed' })
  async toggleQueue(@Param('queueId') queueId: string) {
    return this.queueService.toggleQueueOpen(queueId);
  }
}

