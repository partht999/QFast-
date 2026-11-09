import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { LoyaltyProgramType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateLoyaltyRewardDto } from './dto/create-loyalty-reward.dto';
import { UpdateLoyaltyProgramDto } from './dto/update-loyalty-program.dto';
import { UpdateLoyaltyRewardDto } from './dto/update-loyalty-reward.dto';

@Injectable()
export class LoyaltyService {
  constructor(private prisma: PrismaService) {}

  async getCustomerBalance(slug: string, phone: string) {
    phone = normalizePhone(phone);
    const business = await this.prisma.business.findUnique({
      where: { slug },
      include: { loyaltyProgram: true },
    });
    if (!business) throw new NotFoundException('Restaurant not found');
    if (!business.loyaltyProgram) {
      return {
        hasProgram: false,
        businessName: business.name,
        points: 0,
        stamps: 0,
        stampsForReward: 8,
        rewardName: 'Free visit',
        transactions: [],
      };
    }

    const customer = await this.prisma.customer.findUnique({
      where: { phone },
      include: {
        loyaltyAccounts: {
          where: { programId: business.loyaltyProgram.id },
          include: {
            transactions: {
              orderBy: { createdAt: 'desc' },
              take: 10,
              select: { id: true, type: true, points: true, reason: true, createdAt: true },
            },
          },
        },
      },
    });
    const account = customer?.loyaltyAccounts[0];

    const reward = await this.prisma.loyaltyReward.findFirst({
      where: { programId: business.loyaltyProgram.id, isActive: true },
      orderBy: { createdAt: 'asc' },
    });
    const stampsForReward = business.loyaltyProgram.stampsForReward || reward?.pointsCost || 8;

    return {
      hasProgram: true,
      businessName: business.name,
      programType: business.loyaltyProgram.type,
      points: account?.points || 0,
      stamps: account?.stamps || 0,
      stampsForReward,
      rewardName: reward?.name || 'Free visit',
      transactions: account?.transactions || [],
    };
  }

  async getPublicOffers(slug: string) {
    const business = await this.prisma.business.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        loyaltyProgram: {
          select: {
            type: true,
            pointsPerRupee: true,
            stampsForReward: true,
            rewards: {
              where: { isActive: true },
              orderBy: { pointsCost: 'asc' },
              select: {
                id: true,
                name: true,
                pointsCost: true,
                rewardType: true,
                rewardValue: true,
              },
            },
          },
        },
      },
    });
    if (!business) throw new NotFoundException('Restaurant not found');

    return {
      businessName: business.name,
      hasProgram: Boolean(business.loyaltyProgram),
      programType: business.loyaltyProgram?.type,
      pointsPerRupee: business.loyaltyProgram?.pointsPerRupee,
      stampsForReward: business.loyaltyProgram?.stampsForReward || business.loyaltyProgram?.rewards[0]?.pointsCost || 8,
      rewardName: business.loyaltyProgram?.rewards[0]?.name || 'Free visit',
      rewards: business.loyaltyProgram?.rewards || [],
    };
  }

  async getProgram(businessId: string, userId: string, userRole?: string) {
    await this.assertBusinessAccess(businessId, userId, userRole);
    let program = await this.prisma.loyaltyProgram.findUnique({
      where: { businessId },
      include: { rewards: { orderBy: { createdAt: 'desc' } }, tiers: true },
    });

    if (!program) {
      program = await this.prisma.loyaltyProgram.create({
        data: {
          businessId,
          type: LoyaltyProgramType.VISIT_STAMPS,
          stampsPerVisit: 1,
          stampsForReward: 8,
          rewards: {
            create: {
              name: 'Free visit',
              pointsCost: 8,
              rewardType: 'FREE_ITEM',
              rewardValue: { description: 'Collected after 8 stamps' },
            },
          },
        },
        include: { rewards: { orderBy: { createdAt: 'desc' } }, tiers: true },
      });
    }
    return program;
  }

  async updateProgram(
    businessId: string,
    userId: string,
    userRole: string | undefined,
    data: UpdateLoyaltyProgramDto,
  ) {
    await this.assertBusinessAccess(businessId, userId, userRole);
    const stampsForReward = data.stampsForReward ?? 8;
    const rewardName = data.rewardName?.trim() || 'Free visit';
    const useStamps = !data.type || data.type === LoyaltyProgramType.VISIT_STAMPS || data.stampsForReward != null;

    const program = await this.prisma.loyaltyProgram.upsert({
      where: { businessId },
      update: useStamps
        ? { type: LoyaltyProgramType.VISIT_STAMPS, stampsPerVisit: 1, stampsForReward }
        : {
            type: data.type,
            pointsPerRupee: data.pointsPerRupee,
            expiryDays: data.expiryDays,
          },
      create: {
        businessId,
        type: LoyaltyProgramType.VISIT_STAMPS,
        stampsPerVisit: 1,
        stampsForReward,
      },
      include: { rewards: { orderBy: { createdAt: 'asc' } }, tiers: true },
    });

    if (useStamps) {
      if (program.rewards[0]) {
        await this.prisma.loyaltyReward.update({
          where: { id: program.rewards[0].id },
          data: { name: rewardName, pointsCost: stampsForReward, isActive: true },
        });
      } else {
        await this.prisma.loyaltyReward.create({
          data: {
            programId: program.id,
            name: rewardName,
            pointsCost: stampsForReward,
            rewardType: 'FREE_ITEM',
            rewardValue: { description: `Collected after ${stampsForReward} stamps` },
          },
        });
      }
    }

    return this.prisma.loyaltyProgram.findUnique({
      where: { id: program.id },
      include: { rewards: { orderBy: { createdAt: 'asc' } }, tiers: true },
    });
  }

  async addStamp(businessId: string, userId: string, userRole: string | undefined, phone: string, name?: string) {
    await this.assertBusinessAccess(businessId, userId, userRole);
    const account = await this.awardVisit({
      businessId,
      phone,
      name,
      sourceKey: `manual:${Date.now()}`,
    });
    if (!account) throw new BadRequestException('Save the stamp card before adding a stamp.');
    return this.balanceForPhone(businessId, phone);
  }

  async redeemStamp(businessId: string, userId: string, userRole: string | undefined, phone: string) {
    await this.assertBusinessAccess(businessId, userId, userRole);
    const program = await this.prisma.loyaltyProgram.findUnique({
      where: { businessId },
      include: { rewards: { where: { isActive: true }, orderBy: { createdAt: 'asc' }, take: 1 } },
    });
    if (!program || program.type !== LoyaltyProgramType.VISIT_STAMPS) {
      throw new BadRequestException('Save the stamp card before redeeming.');
    }
    const goal = program.stampsForReward || program.rewards[0]?.pointsCost || 8;
    const customer = await this.prisma.customer.findUnique({ where: { phone: normalizePhone(phone) } });
    const account = customer
      ? await this.prisma.loyaltyAccount.findUnique({
          where: { programId_customerId: { programId: program.id, customerId: customer.id } },
        })
      : null;
    if (!account || account.stamps < goal) {
      throw new BadRequestException(`This guest has ${account?.stamps || 0} of ${goal} stamps.`);
    }

    await this.prisma.$transaction([
      this.prisma.loyaltyAccount.update({
        where: { id: account.id },
        data: { stamps: { decrement: goal } },
      }),
      this.prisma.loyaltyTransaction.create({
        data: {
          accountId: account.id,
          type: 'REDEEM',
          points: -goal,
          reason: program.rewards[0]?.name || 'Stamp reward',
        },
      }),
    ]);
    return this.balanceForPhone(businessId, phone);
  }

  async awardVisit(input: {
    businessId: string;
    phone?: string | null;
    name?: string | null;
    sourceKey: string;
    orderId?: string | null;
  }) {
    const phone = normalizePhone(input.phone);
    if (!phone) return null;
    const program = await this.prisma.loyaltyProgram.findUnique({ where: { businessId: input.businessId } });
    if (!program || program.type !== LoyaltyProgramType.VISIT_STAMPS) return null;

    const customer = await this.prisma.customer.upsert({
      where: { phone },
      update: input.name ? { name: input.name } : {},
      create: { phone, name: input.name || undefined },
    });
    const account = await this.prisma.loyaltyAccount.upsert({
      where: { programId_customerId: { programId: program.id, customerId: customer.id } },
      update: {},
      create: { programId: program.id, customerId: customer.id },
    });
    const existing = await this.prisma.loyaltyTransaction.findFirst({
      where: { accountId: account.id, type: 'STAMP', reason: input.sourceKey },
      select: { id: true },
    });
    if (existing) return account;

    await this.prisma.loyaltyTransaction.create({
      data: {
        accountId: account.id,
        orderId: input.orderId || undefined,
        type: 'STAMP',
        points: 1,
        reason: input.sourceKey,
      },
    });
    return this.prisma.loyaltyAccount.update({
      where: { id: account.id },
      data: { stamps: { increment: 1 } },
    });
  }

  private async balanceForPhone(businessId: string, phone: string) {
    const business = await this.prisma.business.findUnique({ where: { id: businessId }, select: { slug: true } });
    if (!business) throw new NotFoundException('Business not found');
    return this.getCustomerBalance(business.slug, normalizePhone(phone));
  }

  async createReward(
    businessId: string,
    userId: string,
    userRole: string | undefined,
    data: CreateLoyaltyRewardDto,
  ) {
    await this.assertBusinessAccess(businessId, userId, userRole);
    const program = await this.prisma.loyaltyProgram.findUnique({ where: { businessId } });
    if (!program) throw new NotFoundException('Loyalty program not found');

    return this.prisma.loyaltyReward.create({
      data: {
        programId: program.id,
        name: data.name.trim(),
        pointsCost: data.pointsCost,
        rewardType: data.rewardType,
        rewardValue: { description: data.description?.trim() || '' },
      },
    });
  }

  async updateReward(
    businessId: string,
    rewardId: string,
    userId: string,
    userRole: string | undefined,
    data: UpdateLoyaltyRewardDto,
  ) {
    await this.assertBusinessAccess(businessId, userId, userRole);
    const result = await this.prisma.loyaltyReward.updateMany({
      where: { id: rewardId, program: { businessId } },
      data: { isActive: data.isActive },
    });
    if (!result.count) throw new NotFoundException('Loyalty reward not found');
    return this.prisma.loyaltyReward.findUnique({ where: { id: rewardId } });
  }

  async deleteReward(
    businessId: string,
    rewardId: string,
    userId: string,
    userRole?: string,
  ) {
    await this.assertBusinessAccess(businessId, userId, userRole);
    const result = await this.prisma.loyaltyReward.deleteMany({
      where: { id: rewardId, program: { businessId } },
    });
    if (!result.count) throw new NotFoundException('Loyalty reward not found');
    return { deleted: true };
  }

  private async assertBusinessAccess(
    businessId: string,
    userId: string,
    userRole?: string,
  ) {
    if (userRole === 'SUPER_ADMIN') return;
    const staff = await this.prisma.staff.findFirst({
      where: { businessId, userId, isActive: true },
      select: { id: true },
    });
    if (!staff) throw new ForbiddenException('You do not have access to this restaurant loyalty program');
  }
}

function normalizePhone(phone?: string | null) {
  return (phone || '').replace(/[^\d+]/g, '');
}
