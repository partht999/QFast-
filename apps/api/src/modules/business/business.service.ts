import { ForbiddenException, Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBusinessDto } from './dto/create-business.dto';
import { BusinessType, PlanTier, UserRole, SubscriptionStatus, BusinessStatus, QueueTokenStatus } from '@prisma/client';

@Injectable()
export class BusinessService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateBusinessDto) {
    const existing = await this.prisma.business.findUnique({ where: { slug: dto.slug } });
    if (existing) throw new ConflictException(`Slug '${dto.slug}' is already taken. Try another.`);

    const selectedPlan = await this.prisma.plan.findUnique({ where: { tier: PlanTier.ADVANCED } });
    if (!selectedPlan) {
      throw new BadRequestException('The Advanced plan is not ready yet. Run the database seed and try again.');
    }

    const periodEnd = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    const foodBusiness = !dto.type || dto.type === BusinessType.RESTAURANT || dto.type === BusinessType.CAFE;
    const queueLimit = 20;
    const tableLimit = 40;
    const requestedCount = dto.counterCount || (foodBusiness ? 4 : 1);
    const setupCount = Math.min(requestedCount, foodBusiness ? tableLimit : queueLimit);
    const averageWaitMinutes = dto.averageWaitMinutes || 10;
    const queueBase = foodBusiness
      ? 'Walk-in queue'
      : dto.type === BusinessType.CLINIC || dto.type === BusinessType.HOSPITAL
        ? 'Consultation'
        : dto.type === BusinessType.SALON
          ? 'Service desk'
          : dto.type === BusinessType.DIAGNOSTIC_CENTRE
            ? 'Collection desk'
            : 'Service counter';
    const queues = [{ name: queueBase, averageWaitMinutes }];

    const business = await this.prisma.business.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        type: dto.type || BusinessType.RESTAURANT,
        phone: dto.phone,
        email: dto.email,
        address: dto.address,
        timezone: dto.timezone || 'Asia/Kolkata',
        staff: {
          create: {
            userId,
            role: UserRole.OWNER,
          },
        },
        branches: {
          create: {
            name: 'Main Branch',
            address: dto.address,
            phone: dto.phone,
          },
        },
        subscriptions: {
          create: {
            planId: selectedPlan.id,
            status: SubscriptionStatus.ACTIVE,
            currentPeriodStart: new Date(),
            currentPeriodEnd: periodEnd,
            trialEndsAt: null,
          },
        },
        queues: {
          create: queues,
        },
        ...(dto.type === BusinessType.RESTAURANT ||
        dto.type === BusinessType.CAFE ||
        !dto.type
          ? {
              menus: {
                create: {
                  name: 'Main Menu',
                  isDefault: true,
                },
              },
            }
          : {}),
        qrCodes: {
          create: {
            type: 'ENTRANCE',
            slug: `${dto.slug}-entrance`,
            targetUrl: `${
              dto.type === BusinessType.RESTAURANT || dto.type === BusinessType.CAFE
                ? '/r'
                : dto.type === BusinessType.CLINIC ||
                    dto.type === BusinessType.HOSPITAL ||
                    dto.type === BusinessType.DIAGNOSTIC_CENTRE
                  ? '/c'
                  : '/b'
            }/${dto.slug}`,
          },
        },
      },
      include: {
        branches: true,
        subscriptions: { include: { plan: true } },
        staff: true,
      },
    });

    if (foodBusiness) {
      for (let index = 1; index <= setupCount; index += 1) {
        const name = `Table ${index}`;
        await this.prisma.table.create({
          data: {
            businessId: business.id,
            name,
            capacity: 4,
            qrCode: {
              create: {
                businessId: business.id,
                type: 'TABLE',
                slug: `${dto.slug}-table-${index}`,
                targetUrl: `/r/${dto.slug}/table/${encodeURIComponent(name)}`,
              },
            },
          },
        });
      }
    }

    return business;
  }

  async findByOwner(userId: string) {
    const businesses = await this.prisma.business.findMany({
      where: { staff: { some: { userId } } },
      include: {
        branches: true,
        subscriptions: { include: { plan: true } },
      },
    });
    await Promise.all(businesses.map((business) => this.settleExpiredProTrial(business.id)));
    return this.prisma.business.findMany({
      where: { staff: { some: { userId } } },
      include: {
        branches: true,
        subscriptions: { include: { plan: true } },
      },
    });
  }

  private async settleExpiredProTrial(businessId: string) {
    const advanced = await this.prisma.plan.findUnique({ where: { tier: PlanTier.ADVANCED } });
    if (!advanced) return;
    const subscription = await this.prisma.subscription.findUnique({
      where: { businessId },
      include: { plan: true },
    });
    if (!subscription || (subscription.planId === advanced.id && subscription.status === SubscriptionStatus.ACTIVE)) {
      return;
    }
    await this.prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        planId: advanced.id,
        status: SubscriptionStatus.ACTIVE,
        trialEndsAt: null,
        currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      },
    });
  }

  async findById(id: string) {
    await this.settleExpiredProTrial(id);
    const business = await this.prisma.business.findUnique({
      where: { id },
      include: {
        branches: true,
        subscriptions: { include: { plan: true } },
        queues: true,
        menus: true,
      },
    });
    if (!business) throw new NotFoundException('Business not found');
    return business;
  }

  async explore(category?: string, search?: string, location?: string) {
    const where: any = {
      status: { not: BusinessStatus.SUSPENDED },
    };

    if (category && category !== 'ALL') {
      where.type = category as BusinessType;
    }

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { address: { contains: q, mode: 'insensitive' } },
        { queues: { some: { name: { contains: q, mode: 'insensitive' } } } },
        { queues: { some: { doctorName: { contains: q, mode: 'insensitive' } } } },
        { queues: { some: { department: { contains: q, mode: 'insensitive' } } } },
        { queues: { some: { serviceName: { contains: q, mode: 'insensitive' } } } },
      ];
    }

    if (location && location.trim() && location.toLowerCase() !== 'all') {
      where.address = { contains: location.trim(), mode: 'insensitive' };
    }

    const businesses = await this.prisma.business.findMany({
      where,
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
      take: 50,
      orderBy: { createdAt: 'desc' },
    });

    return businesses.map((b) => {
      const activeQueues = b.queues.filter((q) => q.isOpen && !q.isPaused);
      const totalWaiting = b.queues.reduce((acc, q) => acc + q.tokens.length, 0);
      const primaryQueue = b.queues[0];
      const avgWait = primaryQueue?.averageWaitMinutes || 8;
      const estimatedWaitMin = totalWaiting > 0 ? totalWaiting * avgWait : 0;

      return {
        id: b.id,
        name: b.name,
        slug: b.slug,
        type: b.type,
        address: b.address || 'Central City',
        phone: b.phone,
        logoUrl: b.logoUrl,
        isOpen: activeQueues.length > 0,
        activeQueueCount: activeQueues.length,
        totalWaiting,
        estimatedWaitMin,
        primaryQueueId: primaryQueue?.id || null,
        queues: b.queues.map((q) => ({
          id: q.id,
          name: q.name,
          department: q.department,
          doctorName: q.doctorName,
          serviceName: q.serviceName,
          isOpen: q.isOpen,
          isPaused: q.isPaused,
          waitingCount: q.tokens.length,
          averageWaitMinutes: q.averageWaitMinutes,
          estimatedWaitMin: q.tokens.length * q.averageWaitMinutes,
        })),
        rating: 4.8,
        reviewCount: 32 + (b.name.length % 20),
      };
    });
  }

  async findBySlug(slug: string) {
    const business = await this.prisma.business.findUnique({
      where: { slug },
      include: {
        branches: true,
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
        menus: {
          where: { isActive: true },
          include: {
            categories: {
              where: { isActive: true },
              orderBy: { sortOrder: 'asc' },
              include: {
                items: {
                  where: { isAvailable: true },
                  orderBy: { sortOrder: 'asc' },
                  include: { variants: true, addons: true },
                },
              },
            },
          },
        },
      },
    });
    if (!business) throw new NotFoundException('Business not found');
    return business;
  }

  async getTodayReport(businessId: string, userId: string) {
    const business = await this.prisma.business.findFirst({
      where: { id: businessId, staff: { some: { userId, isActive: true } } },
      select: { id: true, name: true, timezone: true, type: true },
    });
    if (!business) throw new ForbiddenException('You do not have access to this workspace');

    const timeZone = business.timezone || 'Asia/Kolkata';
    const start = startOfDayInTimeZone(timeZone);
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

    const [tokens, waitingNow, calledNow, orders] = await Promise.all([
      this.prisma.queueToken.findMany({
        where: {
          queue: { businessId },
          OR: [
            { createdAt: { gte: start, lt: end } },
            { calledAt: { gte: start, lt: end } },
            { completedAt: { gte: start, lt: end } },
            { cancelledAt: { gte: start, lt: end } },
            { status: QueueTokenStatus.NO_SHOW, updatedAt: { gte: start, lt: end } },
          ],
        },
        select: {
          tokenNumber: true,
          customerName: true,
          status: true,
          createdAt: true,
          calledAt: true,
          completedAt: true,
          cancelledAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.queueToken.count({
        where: { queue: { businessId }, status: QueueTokenStatus.WAITING },
      }),
      this.prisma.queueToken.count({
        where: { queue: { businessId }, status: QueueTokenStatus.CALLED },
      }),
      this.prisma.order.findMany({
        where: { businessId, createdAt: { gte: start, lt: end } },
        select: { status: true, totalAmount: true, createdAt: true },
      }),
    ]);

    const joined = tokens.filter((token) => token.createdAt >= start && token.createdAt < end);
    const served = tokens.filter((token) => token.completedAt && token.completedAt >= start && token.completedAt < end);
    const noShow = tokens.filter(
      (token) => token.status === QueueTokenStatus.NO_SHOW && token.updatedAt >= start && token.updatedAt < end,
    );
    const cancelled = tokens.filter(
      (token) => token.cancelledAt && token.cancelledAt >= start && token.cancelledAt < end,
    );
    const waits = joined
      .filter((token) => token.calledAt)
      .map((token) => Math.max(0, Math.round((token.calledAt!.getTime() - token.createdAt.getTime()) / 60000)));
    const services = served
      .filter((token) => token.calledAt && token.completedAt)
      .map((token) => Math.max(0, Math.round((token.completedAt!.getTime() - token.calledAt!.getTime()) / 60000)));

    const hourly = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      label: hourLabel(hour),
      joined: 0,
      served: 0,
    }));
    for (const token of joined) hourly[hourInTimeZone(token.createdAt, timeZone)].joined += 1;
    for (const token of served) hourly[hourInTimeZone(token.completedAt!, timeZone)].served += 1;
    const busiest = hourly.reduce((best, hour) => (hour.joined > best.joined ? hour : best), hourly[0]);

    const completedOrders = orders.filter((order) => order.status === 'COMPLETED');
    const revenue = completedOrders.reduce((sum, order) => sum + Number(order.totalAmount), 0);

    return {
      businessName: business.name,
      dateLabel: new Intl.DateTimeFormat('en-IN', {
        timeZone,
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }).format(start),
      queue: {
        joined: joined.length,
        served: served.length,
        noShow: noShow.length,
        cancelled: cancelled.length,
        stillWaiting: waitingNow,
        calledNow,
        averageWaitMinutes: average(waits),
        averageServiceMinutes: average(services),
        busiestHour: busiest.joined > 0 ? busiest.label : null,
        hourly,
        servedList: served
          .sort((a, b) => b.completedAt!.getTime() - a.completedAt!.getTime())
          .slice(0, 8)
          .map((token) => ({
            tokenNumber: token.tokenNumber,
            customerName: token.customerName,
            waitMinutes: token.calledAt
              ? Math.max(0, Math.round((token.calledAt.getTime() - token.createdAt.getTime()) / 60000))
              : null,
          })),
      },
      orders: {
        placed: orders.length,
        completed: completedOrders.length,
        open: orders.filter((order) => !['COMPLETED', 'CANCELLED', 'REJECTED'].includes(order.status)).length,
        cancelled: orders.filter((order) => order.status === 'CANCELLED' || order.status === 'REJECTED').length,
        revenue,
        averageBill: completedOrders.length ? Math.round(revenue / completedOrders.length) : 0,
      },
    };
  }
}

function average(values: number[]) {
  if (!values.length) return null;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function hourInTimeZone(date: Date, timeZone: string) {
  const hour = new Intl.DateTimeFormat('en-US', { timeZone, hour: '2-digit', hourCycle: 'h23' }).format(date);
  return Number(hour) % 24;
}

function hourLabel(hour: number) {
  const suffix = hour < 12 ? 'am' : 'pm';
  const value = hour % 12 || 12;
  return `${value}${suffix}`;
}

function startOfDayInTimeZone(timeZone: string, date = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
      .formatToParts(date)
      .map((part) => [part.type, part.value]),
  );
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  const offset = asUtc - date.getTime();
  return new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day)) - offset);
}
