import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { EventsGateway } from '../events/events.gateway';
import { LoyaltyService } from '../loyalty/loyalty.service';
import { JoinQueueDto } from './dto/join-queue.dto';
import { UpdateQueueSettingsDto } from './dto/update-queue-settings.dto';
import { BusinessType, OrderStatus, Prisma, QueueEntrySource, QueueTokenStatus } from '@prisma/client';
import { OrdersService } from '../orders/orders.service';
import { billDueReason } from '../orders/payment-state';
import { visitsAreOpen } from '../business/subscription-access';
import { AccessService } from '../access/access.service';
import { guestSecretMatches, hashGuestSecret } from '../access/access.rules';
import { isUniqueConflict, resolveCustomer } from '../../common/customer-identity';
import { normalizePhone, phoneLookupVariants } from '../../common/phone';
import { businessDayRange, localDate, safeTimeZone } from '../../common/time';
import { ACTIVE_QUEUE_STATUSES, allocateDailyToken, assertQueueJoinable, queuePhoneKey, resolvePartySize } from './token-sequence';

@Injectable()
export class QueueService {
  constructor(
    private prisma: PrismaService,
    private events: EventsGateway,
    private loyalty: LoyaltyService,
    private orders: OrdersService,
    private access: AccessService,
  ) {}

  async getStatusBySlug(slug: string) {
    const business = await this.prisma.business.findUnique({
      where: { slug },
      include: {
        queues: {
          where: { isArchived: false },
        },
      },
    });

    if (!business) throw new NotFoundException('Business not found');
    const access = await visitsAreOpen(this.prisma, business.id);
    const profile = {
      logoUrl: business.logoUrl,
      coverUrl: business.coverUrl,
      address: business.address,
      phone: business.phone,
      instagramHandle: business.instagramHandle,
      gstin: business.gstin,
      visitsOpen: access.open,
    };
    const queue = business.queues.find((q) => q.isOpen && !q.isPaused) || business.queues[0];
    if (queue) await this.expireOverdueRemoteTokens(queue.id);
    if (!queue) {
      return {
        businessName: business.name,
        businessType: business.type,
        isOpen: false,
        isPaused: false,
        remoteJoinEnabled: false,
        waitingCount: 0,
        estimatedWaitMin: 0,
        queueId: null,
        ...profile,
      };
    }

    const waitingCount = await this.prisma.queueToken.count({
      where: {
        queueId: queue.id,
        status: { in: [QueueTokenStatus.WAITING, QueueTokenStatus.CALLED] },
      },
    });

    const avgWait = await this.getAverageWaitMinutes(queue.id);

    return {
      businessId: business.id,
      businessName: business.name,
      businessType: business.type,
      queueId: queue.id,
      isOpen: queue.isOpen,
      isPaused: queue.isPaused,
      remoteJoinEnabled: queue.remoteJoinEnabled,
      waitingCount,
      averageWaitMinutes: avgWait,
      estimatedWaitMin: waitingCount * avgWait,
      ...profile,
    };
  }

  async getPublicQueues(slug: string) {
    const business = await this.prisma.business.findUnique({
      where: { slug },
      include: {
        queues: {
          where: { isArchived: false },
          include: {
            tokens: {
              where: {
                status: { in: [QueueTokenStatus.WAITING, QueueTokenStatus.CALLED] },
              },
              select: { id: true, status: true },
            },
          },
        },
      },
    });
    if (!business) throw new NotFoundException('Business not found');

    return business.queues.map((q) => ({
      id: q.id,
      name: q.name,
      department: q.department,
      doctorName: q.doctorName,
      serviceName: q.serviceName,
      isOpen: q.isOpen,
      isPaused: q.isPaused,
      remoteJoinEnabled: q.remoteJoinEnabled,
      waitingCount: q.tokens.length,
      averageWaitMinutes: q.averageWaitMinutes,
      estimatedWaitMin: q.tokens.length * q.averageWaitMinutes,
    }));
  }

  async joinQueue(slug: string, dto: JoinQueueDto, options?: { source?: QueueEntrySource }) {
    const business = await this.prisma.business.findUnique({
      where: { slug },
      include: {
        queues: {
          where: { isArchived: false },
        },
      },
    });

    if (!business) throw new NotFoundException('Business not found');
    const access = await visitsAreOpen(this.prisma, business.id);
    if (!access.open) {
      throw new BadRequestException('This queue is closed because the business plan has expired.');
    }

    let queue = null;
    if (dto.queueId) {
      queue = business.queues.find((q) => q.id === dto.queueId);
      if (!queue) throw new NotFoundException('Selected queue not found');
    } else {
      queue = business.queues.find((q) => q.isOpen && !q.isPaused) || business.queues[0];
    }

    if (!queue || !queue.isOpen) {
      throw new BadRequestException('This queue is currently closed');
    }
    if (queue.isPaused) {
      throw new BadRequestException('This queue is temporarily paused');
    }

    const source = options?.source ?? QueueEntrySource.REMOTE;
    let partySize = 1;
    try {
      partySize = resolvePartySize(business.type, dto.partySize || 1);
      assertQueueJoinable(queue, source === QueueEntrySource.WALK_IN ? 'WALK_IN' : 'REMOTE');
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : 'This queue is not available.');
    }

    await this.expireOverdueRemoteTokens(queue.id);
    let customerPhone: string;
    try {
      customerPhone = normalizePhone(dto.customerPhone);
    } catch {
      throw new BadRequestException('Enter a valid phone number');
    }

    const customer = await resolveCustomer(this.prisma, customerPhone, dto.customerName);
    await this.prisma.customerBusiness.upsert({
      where: {
        customerId_businessId: {
          customerId: customer.id,
          businessId: business.id,
        },
      },
      update: { usualPartySize: partySize },
      create: {
        customerId: customer.id,
        businessId: business.id,
        visitCount: 0,
        usualPartySize: partySize,
      },
    });

    const avgWait = await this.getAverageWaitMinutes(queue.id);
    const waitingBefore = await this.prisma.queueToken.count({
      where: {
        queueId: queue.id,
        status: { in: [QueueTokenStatus.WAITING, QueueTokenStatus.CALLED] },
      },
    });
    const estimatedWaitMin = waitingBefore * avgWait;

    const guestSecret = randomBytes(24).toString('base64url');
    let token: Awaited<ReturnType<QueueService['insertQueueToken']>> | undefined;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        token = await this.insertQueueToken({
          queueId: queue.id,
          timeZone: business.timezone,
          customerId: customer.id,
          customerName: dto.customerName,
          customerPhone,
          guestSecretHash: hashGuestSecret(guestSecret),
          partySize,
          notes: dto.notes,
          doctorName: dto.doctorName,
          serviceName: dto.serviceName,
          source,
          estimatedWaitMin,
        });
        break;
      } catch (error) {
        if (attempt < 2 && isUniqueConflict(error)) continue;
        throw error;
      }
    }
    if (!token) throw new ConflictException('Could not reserve a queue token. Please try again.');

    const position = await this.prisma.queueToken.count({
      where: {
        queueId: queue.id,
        status: { in: [QueueTokenStatus.WAITING, QueueTokenStatus.CALLED] },
        createdAt: { lte: token.createdAt },
      },
    });
    const place = token.status === QueueTokenStatus.WAITING ? position : 0;

    this.events.emitQueueUpdate(business.id, queue.id, {
      type: 'TOKEN_JOINED',
      token,
    });

    return {
      ...publicToken(token),
      guestSecret,
      position: place,
      estimatedWaitMin: place * avgWait,
      businessName: business.name,
      businessSlug: business.slug,
      queueName: queue.name,
      doctorName: token.doctorName,
      serviceName: token.serviceName,
    };
  }

  async getToken(tokenId: string, secret?: string) {
    await this.assertGuest(tokenId, secret);
    await this.expireOverdueRemoteTokens(undefined, tokenId);
    const token = await this.prisma.queueToken.findUnique({
      where: { id: tokenId },
      include: {
        table: { select: { id: true, name: true } },
        orders: {
          include: {
            items: { include: { menuItem: { select: { name: true } } } },
            payments: { select: { id: true, status: true, method: true, amount: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
        queue: {
          include: {
            business: {
              select: {
                id: true,
                name: true,
                slug: true,
                type: true,
                googlePlaceId: true,
                googleReviewUrl: true,
                address: true,
                phone: true,
                logoUrl: true,
                instagramHandle: true,
                gstin: true,
              },
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

    const food = token.queue.business.type === BusinessType.RESTAURANT || token.queue.business.type === BusinessType.CAFE;
    const loyalty = food && token.customerPhone
      ? await this.loyalty.getCustomerBalance(token.queue.business.slug, token.customerPhone)
      : null;

    return {
      ...publicToken(token),
      position: token.status === QueueTokenStatus.WAITING ? position : 0,
      estimatedWaitMin:
        token.status === QueueTokenStatus.WAITING
          ? position * (await this.getAverageWaitMinutes(token.queueId))
          : 0,
      business: token.queue.business,
      loyalty,
    };
  }

  async markOnTheWay(tokenId: string, secret?: string) {
    await this.assertGuest(tokenId, secret);
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
    return publicToken(updated);
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

  async cancelToken(tokenId: string, secret?: string) {
    await this.assertGuest(tokenId, secret);
    const current = await this.prisma.queueToken.findUnique({
      where: { id: tokenId },
      select: { status: true },
    });
    if (!current) throw new UnauthorizedException('This queue link is not valid');
    if (current.status !== QueueTokenStatus.WAITING && current.status !== QueueTokenStatus.CALLED) {
      throw new ConflictException('This place in line can no longer be cancelled.');
    }
    const token = await this.prisma.queueToken.update({
      where: { id: tokenId },
      data: {
        status: QueueTokenStatus.CANCELLED,
        cancelledAt: new Date(),
        activePhoneKey: null,
      },
      include: {
        queue: true,
      },
    });

    this.events.emitQueueUpdate(token.queue.businessId, token.queueId, {
      type: 'TOKEN_CANCELLED',
      tokenId,
    });

    return publicToken(token);
  }

  async getBusinessTokens(businessId: string, userId: string, userRole?: string, queueId?: string) {
    await this.assertBusinessAccess(businessId, userId, userRole);
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { timezone: true },
    });
    const todayStart = businessDayRange(business?.timezone).start;
    const queues = await this.prisma.queue.findMany({
      where: { businessId, isArchived: false },
      orderBy: { createdAt: 'asc' },
    });

    if (queues.length === 0) return { queues: [], queue: null, tokens: [] };

    const selectedQueue = queueId
      ? queues.find((q) => q.id === queueId) || queues[0]
      : queues[0];

    await this.expireOverdueRemoteTokens(selectedQueue.id);

    const tokens = await this.prisma.queueToken.findMany({
      where: {
        queueId: selectedQueue.id,
        createdAt: { gte: todayStart },
      },
      include: {
        table: { select: { id: true, name: true } },
        orders: {
          select: {
            id: true,
            status: true,
            totalAmount: true,
            payments: { select: { status: true, method: true, amount: true } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const alerts = await this.prisma.notification.findMany({
      where: { businessId, templateKey: 'staff-alert', createdAt: { gte: todayStart } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return { queues, queue: selectedQueue, tokens: tokens.map((token) => publicToken(token)), alerts };
  }

  async getQueuesForBusiness(businessId: string, userId: string, userRole?: string) {
    await this.assertBusinessAccess(businessId, userId, userRole);
    return this.prisma.queue.findMany({
      where: { businessId, isArchived: false },
      include: {
        _count: {
          select: {
            tokens: {
              where: {
                status: { in: [QueueTokenStatus.WAITING, QueueTokenStatus.CALLED] },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async createQueue(
    businessId: string,
    dto: {
      name: string;
      department?: string;
      doctorName?: string;
      serviceName?: string;
      averageWaitMinutes?: number;
      arrivalGraceMinutes?: number;
    },
    userId: string,
    userRole?: string,
  ) {
    await this.assertBusinessAccess(businessId, userId, userRole);
    const limit = 20;
    const existing = await this.prisma.queue.count({
      where: { businessId, isArchived: false },
    });
    if (existing >= limit) {
      throw new BadRequestException(
        'This workspace includes 20 queues. Archive one before adding another.',
      );
    }
    return this.prisma.queue.create({
      data: {
        businessId,
        name: dto.name,
        department: dto.department,
        doctorName: dto.doctorName,
        serviceName: dto.serviceName,
        averageWaitMinutes: dto.averageWaitMinutes ?? 8,
        arrivalGraceMinutes: dto.arrivalGraceMinutes ?? 10,
      },
    });
  }

  async updateQueue(
    queueId: string,
    dto: {
      name?: string;
      department?: string;
      doctorName?: string;
      serviceName?: string;
      averageWaitMinutes?: number;
      arrivalGraceMinutes?: number;
      remoteJoinEnabled?: boolean;
    },
    userId: string,
    userRole?: string,
  ) {
    const queue = await this.prisma.queue.findUnique({ where: { id: queueId } });
    if (!queue) throw new NotFoundException('Queue not found');
    await this.assertBusinessAccess(queue.businessId, userId, userRole);

    return this.prisma.queue.update({
      where: { id: queueId },
      data: dto,
    });
  }

  async toggleQueuePaused(queueId: string, userId: string, userRole?: string) {
    const queue = await this.prisma.queue.findUnique({ where: { id: queueId } });
    if (!queue) throw new NotFoundException('Queue not found');
    await this.assertBusinessAccess(queue.businessId, userId, userRole);

    const updated = await this.prisma.queue.update({
      where: { id: queueId },
      data: { isPaused: !queue.isPaused },
    });

    this.events.emitQueueUpdate(updated.businessId, updated.id, {
      type: 'QUEUE_PAUSED_TOGGLED',
      isPaused: updated.isPaused,
    });

    return updated;
  }

  async toggleQueueArchived(queueId: string, userId: string, userRole?: string) {
    const queue = await this.prisma.queue.findUnique({ where: { id: queueId } });
    if (!queue) throw new NotFoundException('Queue not found');
    await this.assertBusinessAccess(queue.businessId, userId, userRole);

    return this.prisma.queue.update({
      where: { id: queueId },
      data: { isArchived: !queue.isArchived },
    });
  }

  async updateTokenStatus(
    tokenId: string,
    status: QueueTokenStatus,
    userId: string,
    userRole?: string,
    tableId?: string,
  ) {
    const currentToken = await this.prisma.queueToken.findUnique({
      where: { id: tokenId },
      include: { queue: { include: { business: { select: { type: true } } } } },
    });
    if (!currentToken) throw new NotFoundException('Queue entry not found');
    await this.assertBusinessAccess(currentToken.queue.businessId, userId, userRole);

    if (status === QueueTokenStatus.CALLED) {
      // Allow calling from WAITING, re-calling from CALLED, or recalling from SKIPPED
      if (
        currentToken.status !== QueueTokenStatus.WAITING &&
        currentToken.status !== QueueTokenStatus.CALLED &&
        currentToken.status !== QueueTokenStatus.SKIPPED
      ) {
        throw new ConflictException(`Only waiting or skipped entries can be called`);
      }

      // FIFO check applies only when calling for the first time from WAITING
      if (currentToken.status === QueueTokenStatus.WAITING) {
        const earlierEntry = await this.prisma.queueToken.findFirst({
          where: {
            queueId: currentToken.queueId,
            status: QueueTokenStatus.WAITING,
            createdAt: { lt: currentToken.createdAt },
          },
          orderBy: { createdAt: 'asc' },
          select: { id: true },
        });
        if (earlierEntry) {
          throw new ConflictException('Call the earliest waiting customer first');
        }
      }
    } else if (status === QueueTokenStatus.WAITING) {
      if (
        currentToken.status !== QueueTokenStatus.SKIPPED &&
        currentToken.status !== QueueTokenStatus.CANCELLED
      ) {
        throw new ConflictException('Only skipped or cancelled entries can be restored to waiting');
      }
    } else if (status === QueueTokenStatus.SEATED) {
      if (
        currentToken.status !== QueueTokenStatus.CALLED &&
        currentToken.status !== QueueTokenStatus.WAITING
      ) {
        throw new ConflictException('Guest must be called before seating');
      }
    } else if (status === QueueTokenStatus.COMPLETED) {
      if (
        currentToken.status !== QueueTokenStatus.CALLED &&
        currentToken.status !== QueueTokenStatus.SEATED
      ) {
        throw new ConflictException('Guest must be called or seated before completing service');
      }
    } else if (status === QueueTokenStatus.SKIPPED || status === QueueTokenStatus.CANCELLED) {
      if (
        currentToken.status === QueueTokenStatus.COMPLETED ||
        currentToken.status === QueueTokenStatus.CANCELLED
      ) {
        throw new ConflictException(`Cannot change an already ${currentToken.status.toLowerCase()} entry`);
      }
    }

    let phoneForKey = currentToken.customerPhone;
    try {
      phoneForKey = normalizePhone(currentToken.customerPhone);
    } catch {
      phoneForKey = currentToken.customerPhone;
    }
    const data: {
      status: QueueTokenStatus;
      activePhoneKey: string | null;
      calledAt?: Date | null;
      arrivalDeadlineAt?: Date | null;
      seatedAt?: Date | null;
      servedAt?: Date | null;
      completedAt?: Date | null;
      cancelledAt?: Date | null;
      tableId?: string | null;
    } = {
      status,
      activePhoneKey: queuePhoneKey(currentToken.queueId, phoneForKey, status),
    };

    const foodBusiness =
      currentToken.queue.business.type === BusinessType.RESTAURANT ||
      currentToken.queue.business.type === BusinessType.CAFE;

    if (status === QueueTokenStatus.WAITING) {
      data.calledAt = null;
      data.arrivalDeadlineAt = null;
      data.seatedAt = null;
      data.servedAt = null;
      data.completedAt = null;
      data.cancelledAt = null;
      data.tableId = null;
    } else if (status === QueueTokenStatus.CALLED) {
      data.calledAt = new Date();
      data.arrivalDeadlineAt =
        currentToken.source === QueueEntrySource.REMOTE
          ? new Date(Date.now() + currentToken.queue.arrivalGraceMinutes * 60_000)
          : null;
      if (foodBusiness && tableId) data.tableId = tableId;
      if (
        foodBusiness &&
        !tableId &&
        !currentToken.tableId &&
        currentToken.status !== QueueTokenStatus.CALLED
      ) {
        throw new BadRequestException('Choose a table that fits this party.');
      }
    } else if (status === QueueTokenStatus.SEATED) {
      data.seatedAt = new Date();
      data.servedAt = new Date();
      if (tableId) data.tableId = tableId;
      if (foodBusiness && !tableId && !currentToken.tableId) {
        throw new BadRequestException('Choose a table that fits this party.');
      }
    } else if (status === QueueTokenStatus.COMPLETED) {
      data.completedAt = new Date();
      if (!currentToken.servedAt) data.servedAt = new Date();
    } else if (status === QueueTokenStatus.CANCELLED) {
      data.cancelledAt = new Date();
      data.tableId = null;
    } else if (status === QueueTokenStatus.SKIPPED) {
      data.tableId = null;
    }

    if (status === QueueTokenStatus.COMPLETED && foodBusiness) {
      await this.assertBillCanClose(tokenId);
      const readyOrders = await this.prisma.order.findMany({
        where: { queueTokenId: tokenId, status: OrderStatus.READY },
        select: { id: true },
      });
      for (const order of readyOrders) {
        await this.orders.completeFromQueue(order.id);
      }
    }

    const token = await this.saveTokenWithTable(
      tokenId,
      currentToken.queue.businessId,
      currentToken.partySize,
      data,
    );

    if (
      status === QueueTokenStatus.SKIPPED ||
      status === QueueTokenStatus.CANCELLED ||
      status === QueueTokenStatus.WAITING
    ) {
      await this.releasePartyTable(tokenId);
    }

    const linkedTableId = token.tableId;
    if (linkedTableId && (status === QueueTokenStatus.CALLED || status === QueueTokenStatus.SEATED)) {
      await this.prisma.order.updateMany({
        where: { queueTokenId: tokenId, tableId: null },
        data: { tableId: linkedTableId },
      });
    }

    // If seated and tableId provided, link any queue pre-orders to this table
    if (status === QueueTokenStatus.SEATED && tableId) {
      const linkedOrders = await this.prisma.order.findMany({
        where: { queueTokenId: tokenId },
      });
      if (linkedOrders.length > 0) {
        await this.prisma.order.updateMany({
          where: { queueTokenId: tokenId },
          data: { tableId },
        });
        for (const order of linkedOrders) {
          const updated = await this.prisma.order.findUnique({
            where: { id: order.id },
            include: {
              table: true,
              queueToken: true,
              items: { include: { menuItem: true } },
            },
          });
          if (updated) {
            this.events.emitOrderUpdate(token.queue.businessId, order.id, {
              type: 'ORDER_SEATED_AT_TABLE',
              order: updated,
            });
          }
        }
      }
    }

    this.events.emitQueueUpdate(token.queue.businessId, token.queueId, {
      type: 'TOKEN_STATUS_CHANGED',
      token,
    });

    if (status === QueueTokenStatus.COMPLETED && token.customerPhone) {
      await this.loyalty.awardVisit({
        businessId: token.queue.businessId,
        phone: token.customerPhone,
        name: token.customerName,
        sourceKey: `token:${token.id}`,
      });
    }

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
    return this.joinQueue(business.slug, dto, { source: QueueEntrySource.WALK_IN });
  }

  private async getAverageWaitMinutes(queueId: string): Promise<number> {
    const queue = await this.prisma.queue.findUnique({
      where: { id: queueId },
      select: { averageWaitMinutes: true, business: { select: { timezone: true } } },
    });
    if (!queue) return 8;

    const todayStart = businessDayRange(queue.business.timezone).start;

    const completedToday = await this.prisma.queueToken.findMany({
      where: {
        queueId,
        status: QueueTokenStatus.COMPLETED,
        completedAt: { gte: todayStart },
        calledAt: { not: null },
      },
      select: { calledAt: true, completedAt: true },
      take: 10,
    });

    if (completedToday.length >= 3) {
      const validTokens = completedToday.filter((t) => t.calledAt && t.completedAt);
      if (validTokens.length >= 3) {
        const totalMinutes = validTokens.reduce((acc, t) => {
          const diffMin = Math.round((t.completedAt!.getTime() - t.calledAt!.getTime()) / 60000);
          return acc + Math.max(1, Math.min(60, diffMin));
        }, 0);
        return Math.max(2, Math.round(totalMinutes / validTokens.length));
      }
    }

    return queue.averageWaitMinutes ?? 8;
  }

  async markTokenPaid(tokenId: string, userId: string, userRole?: string) {
    const token = await this.prisma.queueToken.findUnique({
      where: { id: tokenId },
      include: { queue: true },
    });
    if (!token) throw new NotFoundException('Queue entry not found');
    await this.assertBusinessAccess(token.queue.businessId, userId, userRole);
    const orders = await this.prisma.order.findMany({
      where: { queueTokenId: tokenId, status: { notIn: [OrderStatus.CANCELLED, OrderStatus.REJECTED, OrderStatus.COMPLETED] } },
      select: { id: true, status: true },
    });
    if (orders.some((order) => ['PENDING', 'ACCEPTED', 'PREPARING'].includes(order.status))) {
      throw new ConflictException('The kitchen is still cooking. Take payment when the food is ready.');
    }
    for (const order of orders) {
      await this.orders.collectBill(order.id, undefined, { requireReady: true });
    }
    return { ok: true };
  }

  async dismissAlert(alertId: string, userId: string, userRole?: string) {
    const alert = await this.prisma.notification.findUnique({ where: { id: alertId } });
    if (!alert || alert.templateKey !== 'staff-alert') throw new NotFoundException('Alert not found');
    await this.assertBusinessAccess(alert.businessId, userId, userRole);
    await this.prisma.notification.delete({ where: { id: alertId } });
    return { ok: true };
  }

  private async releasePartyTable(tokenId: string) {
    await this.prisma.order.updateMany({
      where: { queueTokenId: tokenId },
      data: { tableId: null },
    });
    await this.prisma.order.updateMany({
      where: {
        queueTokenId: tokenId,
        status: { in: [OrderStatus.PENDING, OrderStatus.ACCEPTED, OrderStatus.PREPARING] },
      },
      data: { status: OrderStatus.PENDING },
    });
  }

  private async assertBillCanClose(tokenId: string) {
    const orders = await this.prisma.order.findMany({
      where: { queueTokenId: tokenId, status: { notIn: [OrderStatus.CANCELLED, OrderStatus.REJECTED] } },
      include: { payments: true },
    });
    if (orders.some((order) => ['PENDING', 'ACCEPTED', 'PREPARING'].includes(order.status))) {
      throw new ConflictException('The kitchen is still cooking. Close the bill when the food is ready.');
    }
    for (const order of orders) {
      const reason = billDueReason(Number(order.totalAmount), order.payments);
      if (reason) throw new ConflictException(reason);
    }
  }

  private async saveTokenWithTable(
    tokenId: string,
    businessId: string,
    partySize: number,
    data: Prisma.QueueTokenUncheckedUpdateInput,
  ) {
    const tableId = typeof data.tableId === 'string' ? data.tableId : undefined;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        return await this.prisma.$transaction(
          async (tx) => {
            if (tableId) await this.assertTableFits(tx, businessId, tokenId, tableId, partySize);
            const token = await tx.queueToken.update({
              where: { id: tokenId },
              data,
              include: { queue: true, table: true },
            });
            if (token.tableId) {
              const holders = await tx.queueToken.count({
                where: {
                  tableId: token.tableId,
                  status: { in: [QueueTokenStatus.CALLED, QueueTokenStatus.SEATED] },
                },
              });
              if (holders > 1) throw new ConflictException('That table was just given to another party.');
            }
            return token;
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );
      } catch (error) {
        if (isUniqueConflict(error)) {
          throw new ConflictException('There is already an active queue entry for this phone number.');
        }
        if (attempt === 0 && error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
          continue;
        }
        throw error;
      }
    }
    throw new ConflictException('That table was just given to another party.');
  }

  private async assertTableFits(
    tx: Prisma.TransactionClient,
    businessId: string,
    tokenId: string,
    tableId: string,
    partySize: number,
  ) {
    const table = await tx.table.findFirst({ where: { id: tableId, businessId, isActive: true } });
    if (!table) throw new BadRequestException('That table is not available.');
    if (table.capacity < partySize) {
      throw new BadRequestException(`${table.name} seats ${table.capacity}. This party has ${partySize}.`);
    }
    const holder = await tx.queueToken.findFirst({
      where: {
        tableId,
        id: { not: tokenId },
        status: { in: [QueueTokenStatus.CALLED, QueueTokenStatus.SEATED] },
      },
      select: { tokenNumber: true },
    });
    if (holder) throw new ConflictException(`${table.name} is already with party #${holder.tokenNumber}.`);
  }

  private async expireOverdueRemoteTokens(queueId?: string, tokenId?: string) {
    const now = new Date();
    const overdue = await this.prisma.queueToken.findMany({
      where: {
        ...(queueId ? { queueId } : {}),
        ...(tokenId ? { id: tokenId } : {}),
        source: QueueEntrySource.REMOTE,
        status: QueueTokenStatus.CALLED,
        arrivedAt: null,
        arrivalDeadlineAt: { lte: now },
      },
      select: { id: true },
    });
    if (!overdue.length) return 0;
    const ids = overdue.map((token) => token.id);
    await this.prisma.queueToken.updateMany({
      where: { id: { in: ids } },
      data: { status: QueueTokenStatus.NO_SHOW, tableId: null, activePhoneKey: null },
    });
    for (const id of ids) await this.releasePartyTable(id);
    return ids.length;
  }

  private async insertQueueToken(input: {
    queueId: string;
    timeZone: string | null;
    customerId: string;
    customerName: string;
    customerPhone: string;
    guestSecretHash: string;
    partySize: number;
    notes?: string;
    doctorName?: string;
    serviceName?: string;
    source: QueueEntrySource;
    estimatedWaitMin: number;
  }) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Queue" WHERE id = ${input.queueId} FOR UPDATE`;
      const existingToken = await tx.queueToken.findFirst({
        where: {
          queueId: input.queueId,
          customerPhone: { in: phoneLookupVariants(input.customerPhone) },
          status: { in: [...ACTIVE_QUEUE_STATUSES] },
        },
      });
      if (existingToken) {
        return tx.queueToken.update({
          where: { id: existingToken.id },
          data: { guestSecretHash: input.guestSecretHash },
        });
      }
      const qRec = await tx.queue.findUnique({ where: { id: input.queueId } });
      if (!qRec) throw new NotFoundException('Queue not found');
      const sequenceDate = localDate(new Date(), safeTimeZone(input.timeZone));
      const tokenNumber = allocateDailyToken(
        { lastSequenceDate: qRec.lastSequenceDate, dailySequence: qRec.dailySequence || 0 },
        sequenceDate,
      );
      await tx.queue.update({
        where: { id: input.queueId },
        data: { dailySequence: tokenNumber, lastSequenceDate: sequenceDate },
      });
      return tx.queueToken.create({
        data: {
          queueId: input.queueId,
          customerId: input.customerId,
          customerName: input.customerName,
          customerPhone: input.customerPhone,
          guestSecretHash: input.guestSecretHash,
          partySize: input.partySize,
          notes: input.notes,
          tokenNumber,
          sequenceDate,
          activePhoneKey: queuePhoneKey(input.queueId, input.customerPhone, QueueTokenStatus.WAITING),
          doctorName: input.doctorName || qRec.doctorName,
          serviceName: input.serviceName || qRec.serviceName,
          status: QueueTokenStatus.WAITING,
          source: input.source,
          estimatedWaitMin: input.estimatedWaitMin,
        },
      });
    });
  }

  private async assertBusinessAccess(businessId: string, userId: string, _userRole?: string) {
    await this.access.requireStaff(userId, businessId);
  }

  private async assertGuest(tokenId: string, secret?: string) {
    const token = await this.prisma.queueToken.findUnique({
      where: { id: tokenId },
      select: { guestSecretHash: true },
    });
    if (!token || !guestSecretMatches(token.guestSecretHash, secret)) {
      throw new UnauthorizedException('This queue link is not valid');
    }
  }
}

function publicToken<T extends { guestSecretHash?: string | null }>(token: T) {
  const { guestSecretHash: _hash, ...safe } = token;
  return safe;
}
