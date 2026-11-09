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

    const essentialPlan = await this.prisma.plan.findUnique({
      where: { tier: PlanTier.ESSENTIAL },
    });
    if (!essentialPlan) {
      throw new Error('Default Essential plan is not seeded. Run database seed.');
    }

    const trialEnd = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

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
            planId: essentialPlan.id,
            status: SubscriptionStatus.TRIALING,
            currentPeriodStart: new Date(),
            currentPeriodEnd: trialEnd,
            trialEndsAt: trialEnd,
          },
        },
        queues: {
          create: {
            name: 'General Queue',
          },
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

    return business;
  }

  async findByOwner(userId: string) {
    return this.prisma.business.findMany({
      where: { staff: { some: { userId } } },
      include: {
        branches: true,
        subscriptions: { include: { plan: true } },
      },
    });
  }

  async findById(id: string) {
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
