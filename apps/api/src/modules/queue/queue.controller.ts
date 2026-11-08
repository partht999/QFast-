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
import { QueueService } from './queue.service';
import { JoinQueueDto } from './dto/join-queue.dto';
import { UpdateQueueSettingsDto } from './dto/update-queue-settings.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { QueueTokenStatus } from '@prisma/client';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';

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
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Customer joins queue via entrance QR' })
  async joinQueue(@Param('slug') slug: string, @Body() dto: JoinQueueDto) {
    return this.queueService.joinQueue(slug, dto);
  }

  @Get('public/token/:tokenId')
  @ApiOperation({ summary: 'Track a specific queue token in real-time' })
  async getToken(@Param('tokenId') tokenId: string) {
    return this.queueService.getToken(tokenId);
  }

  @Post('public/token/:tokenId/on-the-way')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Remote guest confirms they are on the way' })
  async markOnTheWay(@Param('tokenId') tokenId: string) {
    return this.queueService.markOnTheWay(tokenId);
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
  async getBusinessTokens(@Param('businessId') businessId: string, @Req() req: any) {
    return this.queueService.getBusinessTokens(businessId, req.user.sub, req.user.role);
  }

  @Post('manage/:businessId/walk-in')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add a walk-in guest from restaurant operations' })
  async createWalkIn(
    @Param('businessId') businessId: string,
    @Body() dto: JoinQueueDto,
    @Req() req: any,
  ) {
    return this.queueService.createWalkIn(businessId, dto, req.user.sub, req.user.role);
  }

  @Patch('manage/token/:tokenId/call')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Call the guest forward' })
  async callToken(@Param('tokenId') tokenId: string, @Req() req: any) {
    return this.queueService.updateTokenStatus(tokenId, QueueTokenStatus.CALLED, req.user.sub, req.user.role);
  }

  @Patch('manage/token/:tokenId/arrive')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check in a remote guest at the restaurant' })
  async staffMarkArrived(@Param('tokenId') tokenId: string, @Req() req: any) {
    return this.queueService.markArrived(tokenId, req.user.sub, req.user.role);
  }

  @Patch('manage/token/:tokenId/seat')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Seat the guest at a table' })
  async seatToken(@Param('tokenId') tokenId: string, @Req() req: any) {
    return this.queueService.updateTokenStatus(tokenId, QueueTokenStatus.SEATED, req.user.sub, req.user.role);
  }

  @Patch('manage/token/:tokenId/complete')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark a FIFO service visit as completed' })
  async completeToken(@Param('tokenId') tokenId: string, @Req() req: any) {
    return this.queueService.updateTokenStatus(
      tokenId,
      QueueTokenStatus.COMPLETED,
      req.user.sub,
      req.user.role,
    );
  }

  @Patch('manage/token/:tokenId/skip')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark token as skipped' })
  async skipToken(@Param('tokenId') tokenId: string, @Req() req: any) {
    return this.queueService.updateTokenStatus(tokenId, QueueTokenStatus.SKIPPED, req.user.sub, req.user.role);
  }

  @Patch('manage/token/:tokenId/cancel')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel or no-show token' })
  async staffCancelToken(@Param('tokenId') tokenId: string, @Req() req: any) {
    return this.queueService.updateTokenStatus(tokenId, QueueTokenStatus.CANCELLED, req.user.sub, req.user.role);
  }

  @Patch('manage/queue/:queueId/toggle')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Toggle queue open/closed' })
  async toggleQueue(@Param('queueId') queueId: string, @Req() req: any) {
    return this.queueService.toggleQueueOpen(queueId, req.user.sub, req.user.role);
  }

  @Patch('manage/queue/:queueId/remote-toggle')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Enable or disable remote queue joining' })
  async toggleRemoteJoin(@Param('queueId') queueId: string, @Req() req: any) {
    return this.queueService.toggleRemoteJoin(queueId, req.user.sub, req.user.role);
  }

  @Patch('manage/queue/:queueId/settings')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update queue wait estimate and arrival grace settings' })
  async updateQueueSettings(
    @Param('queueId') queueId: string,
    @Body() dto: UpdateQueueSettingsDto,
    @Req() req: any,
  ) {
    return this.queueService.updateQueueSettings(queueId, dto, req.user.sub, req.user.role);
  }
}
