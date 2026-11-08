import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EventsGateway } from '../events/events.gateway';
import { JoinQueueDto } from './dto/join-queue.dto';
import { QueueTokenStatus } from '@prisma/client';

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
          where: { isOpen: true },
          take: 1,
        },
      },
    });

    if (!business) throw new NotFoundException('Restaurant not found');
    const queue = business.queues[0];
    if (!queue) {
      return {
        businessName: business.name,
        isOpen: false,
        waitingCount: 0,
        estimatedWaitMin: 0,
        queueId: null,
      };
    }

    const waitingCount = await this.prisma.queueToken.count({
      where: {
        queueId: queue.id,
        status: QueueTokenStatus.WAITING,
      },
    });

    return {
      businessId: business.id,
      businessName: business.name,
      queueId: queue.id,
      isOpen: queue.isOpen,
      waitingCount,
      estimatedWaitMin: waitingCount * 8, // ~8 min per party avg
    };
  }

  async joinQueue(slug: string, dto: JoinQueueDto) {
    const business = await this.prisma.business.findUnique({
      where: { slug },
      include: {
        queues: {
          where: { isOpen: true },
          take: 1,
        },
      },
    });

    if (!business) throw new NotFoundException('Restaurant not found');
    const queue = business.queues[0];
    if (!queue || !queue.isOpen) {
      throw new BadRequestException('Queue is currently closed');
    }

    // Upsert customer profile if phone exists
    const customer = await this.prisma.customer.upsert({
      where: { phone: dto.customerPhone },
      update: { name: dto.customerName },
      create: {
        phone: dto.customerPhone,
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
        usualPartySize: dto.partySize,
      },
      create: {
        customerId: customer.id,
        businessId: business.id,
        visitCount: 1,
        lastVisitAt: new Date(),
        usualPartySize: dto.partySize,
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
        status: QueueTokenStatus.WAITING,
      },
    });

    const estimatedWaitMin = Math.max(5, waitingBefore * 8);

    const token = await this.prisma.queueToken.create({
      data: {
        queueId: queue.id,
        customerId: customer.id,
        customerName: dto.customerName,
        customerPhone: dto.customerPhone,
        partySize: dto.partySize,
        notes: dto.notes,
        tokenNumber: nextTokenNumber,
        status: QueueTokenStatus.WAITING,
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
      businessName: business.name,
      businessSlug: business.slug,
    };
  }

  async getToken(tokenId: string) {
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
        status: QueueTokenStatus.WAITING,
        createdAt: { lte: token.createdAt },
      },
    });

    return {
      ...token,
      position: token.status === QueueTokenStatus.WAITING ? position : 0,
      business: token.queue.business,
    };
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

  async getBusinessTokens(businessId: string) {
    const queue = await this.prisma.queue.findFirst({
      where: { businessId },
    });

    if (!queue) return { queue: null, tokens: [] };

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

  async updateTokenStatus(tokenId: string, status: QueueTokenStatus) {
    const data: any = { status };
    if (status === QueueTokenStatus.CALLED) data.calledAt = new Date();
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

  async toggleQueueOpen(queueId: string) {
    const current = await this.prisma.queue.findUnique({ where: { id: queueId } });
    if (!current) throw new NotFoundException('Queue not found');

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
}

