import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBusinessDto } from './dto/create-business.dto';
import { BusinessType, PlanTier, UserRole, SubscriptionStatus } from '@prisma/client';

@Injectable()
export class BusinessService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateBusinessDto) {
    if (
      dto.type &&
      dto.type !== BusinessType.RESTAURANT &&
      dto.type !== BusinessType.CAFE
    ) {
      throw new BadRequestException('This business category is not available yet. Choose Restaurant or Cafe.');
    }

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

  async findBySlug(slug: string) {
    const business = await this.prisma.business.findUnique({
      where: { slug },
      include: {
        branches: true,
        queues: { where: { isOpen: true } },
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
