import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBusinessDto } from './dto/create-business.dto';
import { BusinessType, PlanTier, UserRole, SubscriptionStatus, BusinessStatus, QueueTokenStatus } from '@prisma/client';

@Injectable()
export class BusinessService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateBusinessDto) {
    const existing = await this.prisma.business.findUnique({ where: { slug: dto.slug } });
    if (existing) throw new ConflictException(`Slug '${dto.slug}' is already taken. Try another.`);

    const requestedPlan = dto.plan || 'free';
    const tier = requestedPlan === 'pro'
      ? PlanTier.ADVANCED
      : requestedPlan === 'plus'
        ? PlanTier.ESSENTIAL
        : PlanTier.FREE;
    const selectedPlan = await this.prisma.plan.findUnique({ where: { tier } });
    if (!selectedPlan) {
      throw new BadRequestException('Plans are not ready yet. Run the database seed and try again.');
    }

    const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const proTrial = requestedPlan === 'pro';
    const foodBusiness = !dto.type || dto.type === BusinessType.RESTAURANT || dto.type === BusinessType.CAFE;
    const queueLimit = tier === PlanTier.ADVANCED ? 20 : tier === PlanTier.ESSENTIAL ? 8 : 1;
    const tableLimit = tier === PlanTier.ADVANCED ? 40 : tier === PlanTier.ESSENTIAL ? 20 : 4;
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
    const queues = foodBusiness
      ? [{ name: queueBase, averageWaitMinutes }]
      : Array.from({ length: setupCount }, (_, index) => ({
          name: setupCount === 1 ? queueBase : `${queueBase} ${index + 1}`,
          averageWaitMinutes,
        }));

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
            status: proTrial ? SubscriptionStatus.TRIALING : SubscriptionStatus.ACTIVE,
            currentPeriodStart: new Date(),
            currentPeriodEnd: periodEnd,
            trialEndsAt: proTrial ? periodEnd : null,
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
    const subscription = await this.prisma.subscription.findUnique({ where: { businessId } });
    if (
      !subscription ||
      subscription.status !== SubscriptionStatus.TRIALING ||
      !subscription.trialEndsAt ||
      subscription.trialEndsAt > new Date()
    ) {
      return;
    }

    const freePlan = await this.prisma.plan.findUnique({ where: { tier: PlanTier.FREE } });
    if (!freePlan) return;

    await this.prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        planId: freePlan.id,
        status: SubscriptionStatus.ACTIVE,
        trialEndsAt: null,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
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
}
