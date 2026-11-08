import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EventsGateway } from '../events/events.gateway';
import { JoinQueueDto } from './dto/join-queue.dto';
import { UpdateQueueSettingsDto } from './dto/update-queue-settings.dto';
import { BusinessType, QueueEntrySource, QueueTokenStatus } from '@prisma/client';

@Injectable()
export class QueueService {
  constructor(
    private prisma: PrismaService,
    private events: EventsGateway,
  ) {}

  async getStatusBySlug(slug: string) {
    const business = await this.prisma.business.findUnique({
      where: { slug },
      include: {
        queues: {
          take: 1,
        },
      },
    });

    if (!business) throw new NotFoundException('Business not found');
    const queue = business.queues[0];
    if (queue) await this.expireOverdueRemoteTokens(queue.id);
    if (!queue) {
      return {
        businessName: business.name,
        businessType: business.type,
        isOpen: false,
        remoteJoinEnabled: false,
        waitingCount: 0,
        estimatedWaitMin: 0,
        queueId: null,
      };
    }

    const waitingCount = await this.prisma.queueToken.count({
      where: {
        queueId: queue.id,
        status: { in: [QueueTokenStatus.WAITING, QueueTokenStatus.CALLED] },
      },
    });

    return {
      businessId: business.id,
      businessName: business.name,
      businessType: business.type,
      queueId: queue.id,
      isOpen: queue.isOpen,
      remoteJoinEnabled: queue.remoteJoinEnabled,
      waitingCount,
      averageWaitMinutes: queue.averageWaitMinutes,
      estimatedWaitMin: waitingCount * queue.averageWaitMinutes,
    };
  }

  async joinQueue(slug: string, dto: JoinQueueDto) {
    const business = await this.prisma.business.findUnique({
      where: { slug },
      include: {
        queues: {
          take: 1,
        },
      },
    });

    if (!business) throw new NotFoundException('Business not found');
    const queue = business.queues[0];
    if (!queue || !queue.isOpen) {
      throw new BadRequestException('Queue is currently closed');
    }
    const source = dto.source ?? QueueEntrySource.REMOTE;
    const partySize =
      business.type === BusinessType.RESTAURANT || business.type === BusinessType.CAFE
        ? dto.partySize
        : 1;
    if (source === QueueEntrySource.REMOTE && !queue.remoteJoinEnabled) {
      throw new BadRequestException('Remote queue joining is currently disabled');
    }

    await this.expireOverdueRemoteTokens(queue.id);
    const customerPhone = this.normalizePhone(dto.customerPhone);
    if (!/^\+?\d{7,15}$/.test(customerPhone)) {
      throw new BadRequestException('Enter a valid phone number');
    }

    const existingToken = await this.prisma.queueToken.findFirst({
      where: {
        queueId: queue.id,
        customerPhone,
        status: { in: [QueueTokenStatus.WAITING, QueueTokenStatus.CALLED] },
      },
    });
    if (existingToken) {
      throw new ConflictException(
        `There is already an active queue entry for this phone number (token #${existingToken.tokenNumber}).`,
      );
    }

    // Upsert customer profile if phone exists
    const customer = await this.prisma.customer.upsert({
      where: { phone: customerPhone },
      update: { name: dto.customerName },
      create: {
        phone: customerPhone,
        name: dto.customerName,
      },
    });

    // Upsert customer business link
    await this.prisma.customerBusiness.upsert({
      where: {
        customerId_businessId: {
          customerId: customer.id,
          businessId: business.id,
        },
      },
      update: {
        visitCount: { increment: 1 },
        lastVisitAt: new Date(),
        usualPartySize: partySize,
      },
      create: {
        customerId: customer.id,
        businessId: business.id,
        visitCount: 1,
        lastVisitAt: new Date(),
        usualPartySize: partySize,
      },
    });

    // Calculate token number
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const latestToken = await this.prisma.queueToken.findFirst({
      where: {
        queueId: queue.id,
        createdAt: { gte: todayStart },
      },
      orderBy: { tokenNumber: 'desc' },
    });

    const nextTokenNumber = (latestToken?.tokenNumber || 0) + 1;

    // Calculate current waiting count for wait time
    const waitingBefore = await this.prisma.queueToken.count({
      where: {
        queueId: queue.id,
        status: { in: [QueueTokenStatus.WAITING, QueueTokenStatus.CALLED] },
      },
    });

    const estimatedWaitMin = waitingBefore * queue.averageWaitMinutes;

    const token = await this.prisma.queueToken.create({
      data: {
        queueId: queue.id,
        customerId: customer.id,
        customerName: dto.customerName,
        customerPhone,
        partySize,
        notes: dto.notes,
        tokenNumber: nextTokenNumber,
        status: QueueTokenStatus.WAITING,
        source,
        estimatedWaitMin,
      },
    });

    // Emit live update to dashboard
    this.events.emitQueueUpdate(business.id, queue.id, {
      type: 'TOKEN_JOINED',
      token,
    });

    return {
      ...token,
      position: waitingBefore + 1,
      estimatedWaitMin,
      businessName: business.name,
      businessSlug: business.slug,
    };
  }

  async getToken(tokenId: string) {
    await this.expireOverdueRemoteTokens(undefined, tokenId);
    const token = await this.prisma.queueToken.findUnique({
      where: { id: tokenId },
      include: {
        queue: {
          include: {
            business: {
              select: { id: true, name: true, slug: true },
            },
          },
        },
      },
    });

    if (!token) throw new NotFoundException('Token not found');

    // Calculate position
    const position = await this.prisma.queueToken.count({
      where: {
        queueId: token.queueId,
        status: { in: [QueueTokenStatus.WAITING, QueueTokenStatus.CALLED] },
        createdAt: { lte: token.createdAt },
      },
    });

    return {
      ...token,
      position: token.status === QueueTokenStatus.WAITING ? position : 0,
      estimatedWaitMin:
        token.status === QueueTokenStatus.WAITING
          ? position * (await this.getAverageWaitMinutes(token.queueId))
          : 0,
      business: token.queue.business,
    };
  }

  async markOnTheWay(tokenId: string) {
    await this.expireOverdueRemoteTokens(undefined, tokenId);
    const token = await this.prisma.queueToken.findUnique({
      where: { id: tokenId },
      include: { queue: true },
    });
    if (!token) throw new NotFoundException('Queue entry not found');
    if (token.source !== QueueEntrySource.REMOTE || token.status !== QueueTokenStatus.CALLED) {
      throw new BadRequestException('Only a called remote guest can confirm they are on the way');
    }
    if (token.arrivedAt) throw new BadRequestException('Arrival has already been checked in');
    if (token.onTheWayAt) throw new ConflictException('You have already confirmed you are on the way');

    const updated = await this.prisma.queueToken.update({
      where: { id: tokenId },
      data: {
        onTheWayAt: new Date(),
        arrivalDeadlineAt: new Date(Date.now() + token.queue.arrivalGraceMinutes * 60_000),
      },
    });
    this.events.emitQueueUpdate(token.queue.businessId, token.queueId, {
      type: 'TOKEN_ON_THE_WAY',
      token: updated,
    });
    return updated;
  }

  async markArrived(tokenId: string, userId: string, userRole?: string) {
    const token = await this.prisma.queueToken.findUnique({
      where: { id: tokenId },
      include: { queue: true },
    });
    if (!token) throw new NotFoundException('Queue entry not found');
    await this.assertBusinessAccess(token.queue.businessId, userId, userRole);
    if (token.source !== QueueEntrySource.REMOTE || token.status !== QueueTokenStatus.CALLED) {
      throw new BadRequestException('Only a called remote guest can be checked in');
    }
    if (token.arrivalDeadlineAt && token.arrivalDeadlineAt <= new Date()) {
      await this.expireOverdueRemoteTokens(undefined, tokenId);
      throw new BadRequestException('The arrival window has expired');
    }

    const updated = await this.prisma.queueToken.update({
      where: { id: tokenId },
      data: { arrivedAt: new Date() },
    });
    this.events.emitQueueUpdate(token.queue.businessId, token.queueId, {
      type: 'TOKEN_ARRIVED',
      token: updated,
    });
    return updated;
  }

  async cancelToken(tokenId: string) {
    const token = await this.prisma.queueToken.update({
      where: { id: tokenId },
      data: {
        status: QueueTokenStatus.CANCELLED,
        cancelledAt: new Date(),
      },
      include: {
        queue: true,
      },
    });

    this.events.emitQueueUpdate(token.queue.businessId, token.queueId, {
      type: 'TOKEN_CANCELLED',
      tokenId,
    });

    return token;
  }

  async getBusinessTokens(businessId: string, userId: string, userRole?: string) {
    await this.assertBusinessAccess(businessId, userId, userRole);
    const queue = await this.prisma.queue.findFirst({
      where: { businessId },
    });

    if (!queue) return { queue: null, tokens: [] };
    await this.expireOverdueRemoteTokens(queue.id);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const tokens = await this.prisma.queueToken.findMany({
      where: {
        queueId: queue.id,
        createdAt: { gte: todayStart },
      },
      orderBy: { createdAt: 'asc' },
    });

    return { queue, tokens };
  }

  async updateTokenStatus(
    tokenId: string,
    status: QueueTokenStatus,
    userId: string,
    userRole?: string,
  ) {
    const currentToken = await this.prisma.queueToken.findUnique({
      where: { id: tokenId },
      include: { queue: true },
    });
    if (!currentToken) throw new NotFoundException('Queue entry not found');
    await this.assertBusinessAccess(currentToken.queue.businessId, userId, userRole);

    if (status === QueueTokenStatus.CALLED) {
      if (currentToken.status !== QueueTokenStatus.WAITING) {
        throw new ConflictException('Only a waiting entry can be called');
      }
      const earlierEntry = await this.prisma.queueToken.findFirst({
        where: {
          queueId: currentToken.queueId,
          status: { in: [QueueTokenStatus.WAITING, QueueTokenStatus.CALLED] },
          createdAt: { lt: currentToken.createdAt },
        },
        orderBy: { createdAt: 'asc' },
        select: { id: true },
      });
      if (earlierEntry) {
        throw new ConflictException('Call the earliest waiting customer first');
      }
    }

    if (
      (status === QueueTokenStatus.SEATED || status === QueueTokenStatus.COMPLETED) &&
      currentToken.status !== QueueTokenStatus.CALLED
    ) {
      throw new ConflictException('Call the customer before completing service');
    }

    const data: {
      status: QueueTokenStatus;
      calledAt?: Date;
      arrivalDeadlineAt?: Date | null;
      seatedAt?: Date;
      cancelledAt?: Date;
    } = { status };
    if (status === QueueTokenStatus.CALLED) {
      data.calledAt = new Date();
      data.arrivalDeadlineAt =
        currentToken.source === QueueEntrySource.REMOTE
          ? new Date(Date.now() + currentToken.queue.arrivalGraceMinutes * 60_000)
          : null;
    }
    if (status === QueueTokenStatus.SEATED) data.seatedAt = new Date();
    if (status === QueueTokenStatus.CANCELLED) data.cancelledAt = new Date();

    const token = await this.prisma.queueToken.update({
      where: { id: tokenId },
      data,
      include: { queue: true },
    });

    this.events.emitQueueUpdate(token.queue.businessId, token.queueId, {
      type: 'TOKEN_STATUS_CHANGED',
      token,
    });

    return token;
  }

  async toggleQueueOpen(queueId: string, userId: string, userRole?: string) {
    const current = await this.prisma.queue.findUnique({ where: { id: queueId } });
    if (!current) throw new NotFoundException('Queue not found');
    await this.assertBusinessAccess(current.businessId, userId, userRole);

    const updated = await this.prisma.queue.update({
      where: { id: queueId },
      data: { isOpen: !current.isOpen },
    });

    this.events.emitQueueUpdate(updated.businessId, updated.id, {
      type: 'QUEUE_TOGGLED',
      isOpen: updated.isOpen,
    });

    return updated;
  }

  async toggleRemoteJoin(queueId: string, userId: string, userRole?: string) {
    const current = await this.prisma.queue.findUnique({ where: { id: queueId } });
    if (!current) throw new NotFoundException('Queue not found');
    await this.assertBusinessAccess(current.businessId, userId, userRole);
    const updated = await this.prisma.queue.update({
      where: { id: queueId },
      data: { remoteJoinEnabled: !current.remoteJoinEnabled },
    });
    this.events.emitQueueUpdate(updated.businessId, updated.id, {
      type: 'REMOTE_JOIN_TOGGLED',
      remoteJoinEnabled: updated.remoteJoinEnabled,
    });
    return updated;
  }

  async updateQueueSettings(
    queueId: string,
    dto: UpdateQueueSettingsDto,
    userId: string,
    userRole?: string,
  ) {
    const current = await this.prisma.queue.findUnique({ where: { id: queueId } });
    if (!current) throw new NotFoundException('Queue not found');
    await this.assertBusinessAccess(current.businessId, userId, userRole);
    return this.prisma.queue.update({
      where: { id: queueId },
      data: {
        ...(dto.averageWaitMinutes !== undefined
          ? { averageWaitMinutes: dto.averageWaitMinutes }
          : {}),
        ...(dto.arrivalGraceMinutes !== undefined
          ? { arrivalGraceMinutes: dto.arrivalGraceMinutes }
          : {}),
      },
    });
  }

  async createWalkIn(businessId: string, dto: JoinQueueDto, userId: string, userRole?: string) {
    await this.assertBusinessAccess(businessId, userId, userRole);
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { slug: true },
    });
    if (!business) throw new NotFoundException('Business not found');
    return this.joinQueue(business.slug, { ...dto, source: QueueEntrySource.WALK_IN });
  }

  private normalizePhone(phone: string) {
    return phone.trim().replace(/[^\d+]/g, '');
  }

  private async getAverageWaitMinutes(queueId: string) {
    const queue = await this.prisma.queue.findUnique({
      where: { id: queueId },
      select: { averageWaitMinutes: true },
    });
    return queue?.averageWaitMinutes ?? 8;
  }

  private async expireOverdueRemoteTokens(queueId?: string, tokenId?: string) {
    const now = new Date();
    const result = await this.prisma.queueToken.updateMany({
      where: {
        ...(queueId ? { queueId } : {}),
        ...(tokenId ? { id: tokenId } : {}),
        source: QueueEntrySource.REMOTE,
        status: QueueTokenStatus.CALLED,
        arrivedAt: null,
        arrivalDeadlineAt: { lte: now },
      },
      data: { status: QueueTokenStatus.NO_SHOW },
    });
    return result.count;
  }

  private async assertBusinessAccess(businessId: string, userId: string, userRole?: string) {
    if (userRole === 'SUPER_ADMIN') return;
    const staff = await this.prisma.staff.findFirst({
      where: { businessId, userId, isActive: true },
      select: { id: true },
    });
    if (!staff) throw new ForbiddenException('You do not have access to this business queue');
  }
}
