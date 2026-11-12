import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BusinessType, LoyaltyProgramType, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { findCustomerByPhone, isUniqueConflict, resolveCustomer } from '../../common/customer-identity';
import { normalizePhone } from '../../common/phone';
import { CreateLoyaltyRewardDto } from './dto/create-loyalty-reward.dto';
import { UpdateLoyaltyProgramDto } from './dto/update-loyalty-program.dto';
import { UpdateLoyaltyRewardDto } from './dto/update-loyalty-reward.dto';
import { AccessService } from '../access/access.service';
import { loyaltyAward, loyaltySourceKey } from './award';

@Injectable()
export class LoyaltyService {
  constructor(
    private prisma: PrismaService,
    private access: AccessService,
  ) {}

  async getCustomerBalance(slug: string, phone: string) {
    phone = canonicalPhone(phone);
    const business = await this.prisma.business.findUnique({
      where: { slug },
      include: { loyaltyProgram: true },
    });
    if (!business) throw new NotFoundException('Business not found');
    if (!isRestaurant(business.type) || !business.loyaltyProgram) {
      return {
        hasProgram: false,
        businessName: business.name,
        logoUrl: business.logoUrl,
        points: 0,
        stamps: 0,
        stampsForReward: 8,
        rewardName: 'Free visit',
        transactions: [],
      };
    }

    const matched = phone ? await findCustomerByPhone(this.prisma, phone).catch((error) => {
      if (error instanceof ConflictException) return null;
      throw error;
    }) : null;
    const customer = matched
      ? await this.prisma.customer.findUnique({
      where: { id: matched.id },
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
    })
      : null;
    const account = customer?.loyaltyAccounts[0];

    const reward = await this.prisma.loyaltyReward.findFirst({
      where: { programId: business.loyaltyProgram.id, isActive: true },
      orderBy: { createdAt: 'asc' },
    });
    const stampsForReward = business.loyaltyProgram.stampsForReward || reward?.pointsCost || 8;

    return {
      hasProgram: true,
      businessName: business.name,
      logoUrl: business.logoUrl,
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
        logoUrl: true,
        type: true,
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
    if (!business) throw new NotFoundException('Business not found');
    if (!isRestaurant(business.type)) {
      return { businessName: business.name, logoUrl: business.logoUrl, hasProgram: false, enabled: false, rewards: [] };
    }

    return {
      businessName: business.name,
      logoUrl: business.logoUrl,
      enabled: true,
      hasProgram: Boolean(business.loyaltyProgram),
      programType: business.loyaltyProgram?.type,
      pointsPerRupee: business.loyaltyProgram?.pointsPerRupee,
      stampsForReward: business.loyaltyProgram?.stampsForReward || business.loyaltyProgram?.rewards[0]?.pointsCost || 8,
      rewardName: business.loyaltyProgram?.rewards[0]?.name || 'Free visit',
      rewards: business.loyaltyProgram?.rewards || [],
    };
  }

  async getProgram(businessId: string, userId: string, userRole?: string) {
    await this.assertRestaurantAccess(businessId, userId, userRole);
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
    await this.assertRestaurantAccess(businessId, userId, userRole);
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
    await this.assertRestaurantAccess(businessId, userId, userRole);
    const program = await this.prisma.loyaltyProgram.findUnique({ where: { businessId } });
    if (!program || program.type !== LoyaltyProgramType.VISIT_STAMPS) {
      throw new BadRequestException('Save the stamp card before adding a stamp.');
    }
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
    await this.assertRestaurantAccess(businessId, userId, userRole);
    const program = await this.prisma.loyaltyProgram.findUnique({
      where: { businessId },
      include: { rewards: { where: { isActive: true }, orderBy: { createdAt: 'asc' }, take: 1 } },
    });
    if (!program || program.type !== LoyaltyProgramType.VISIT_STAMPS) {
      throw new BadRequestException('Save the stamp card before redeeming.');
    }
    const goal = program.stampsForReward || program.rewards[0]?.pointsCost || 8;
    const customer = canonicalPhone(phone)
      ? await findCustomerByPhone(this.prisma, phone)
      : null;
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
    subtotal?: number;
    spend?: number;
  }) {
    return this.applyCompletion(this.prisma, {
      businessId: input.businessId,
      phone: input.phone,
      name: input.name,
      visitKey: input.sourceKey,
      orderId: input.orderId,
      subtotal: input.subtotal,
      spend: input.spend,
    });
  }

  async applyCompletion(db: Prisma.TransactionClient | PrismaService, input: {
    businessId: string;
    phone?: string | null;
    name?: string | null;
    visitKey: string;
    orderId?: string | null;
    subtotal?: number;
    spend?: number;
  }) {
    const phone = canonicalPhone(input.phone);
    if (!phone) return null;
    const customer = await resolveCustomer(db, phone, input.name);
    await this.noteOnce(db, {
      businessId: input.businessId,
      customerId: customer.id,
      sourceKey: `visit:${input.visitKey}`,
      visit: true,
    });
    if (input.orderId && input.spend != null) {
      await this.noteOnce(db, {
        businessId: input.businessId,
        customerId: customer.id,
        sourceKey: `spend:${input.orderId}`,
        spend: input.spend,
      });
    }

    const business = await db.business.findUnique({
      where: { id: input.businessId },
      select: { type: true },
    });
    if (!business || !isRestaurant(business.type)) return null;
    const program = await db.loyaltyProgram.findUnique({ where: { businessId: input.businessId } });
    if (!program) return null;
    const award = loyaltyAward(
      {
        type: program.type,
        stampsPerVisit: program.stampsPerVisit,
        pointsPerRupee: program.pointsPerRupee == null ? null : Number(program.pointsPerRupee),
      },
      input.subtotal || 0,
    );
    if (!award) return null;

    const account = await db.loyaltyAccount.upsert({
      where: { programId_customerId: { programId: program.id, customerId: customer.id } },
      update: {},
      create: { programId: program.id, customerId: customer.id },
    });
    try {
      await db.loyaltyTransaction.create({
        data: {
          accountId: account.id,
          orderId: input.orderId || undefined,
          type: award.kind === 'stamps' ? 'STAMP' : 'EARN',
          points: award.amount,
          reason: award.kind === 'stamps' ? 'Completed visit' : 'Completed order',
          sourceKey: loyaltySourceKey(program.type, input.visitKey, input.orderId),
        },
      });
    } catch (error) {
      if (isUniqueConflict(error)) return account;
      throw error;
    }
    return db.loyaltyAccount.update({
      where: { id: account.id },
      data: award.kind === 'stamps'
        ? { stamps: { increment: award.amount } }
        : { points: { increment: award.amount } },
    });
  }

  private async noteOnce(
    db: Prisma.TransactionClient | PrismaService,
    input: { businessId: string; customerId: string; sourceKey: string; visit?: boolean; spend?: number },
  ) {
    try {
      await db.customerVisit.create({
        data: { businessId: input.businessId, customerId: input.customerId, sourceKey: input.sourceKey },
      });
    } catch (error) {
      if (isUniqueConflict(error)) return;
      throw error;
    }
    await db.customerBusiness.upsert({
      where: { customerId_businessId: { customerId: input.customerId, businessId: input.businessId } },
      update: {
        ...(input.visit ? { visitCount: { increment: 1 }, lastVisitAt: new Date() } : {}),
        ...(input.spend != null ? { totalSpend: { increment: input.spend } } : {}),
      },
      create: {
        customerId: input.customerId,
        businessId: input.businessId,
        visitCount: input.visit ? 1 : 0,
        totalSpend: input.spend || 0,
        lastVisitAt: input.visit ? new Date() : undefined,
      },
    });
  }

  private async balanceForPhone(businessId: string, phone: string) {
    const business = await this.prisma.business.findUnique({ where: { id: businessId }, select: { slug: true } });
    if (!business) throw new NotFoundException('Business not found');
    return this.getCustomerBalance(business.slug, canonicalPhone(phone));
  }

  async createReward(
    businessId: string,
    userId: string,
    userRole: string | undefined,
    data: CreateLoyaltyRewardDto,
  ) {
    await this.assertRestaurantAccess(businessId, userId, userRole);
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
    await this.assertRestaurantAccess(businessId, userId, userRole);
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
    await this.assertRestaurantAccess(businessId, userId, userRole);
    const result = await this.prisma.loyaltyReward.deleteMany({
      where: { id: rewardId, program: { businessId } },
    });
    if (!result.count) throw new NotFoundException('Loyalty reward not found');
    return { deleted: true };
  }

  private async assertRestaurantAccess(businessId: string, userId: string, userRole?: string) {
    await this.assertBusinessAccess(businessId, userId, userRole);
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { type: true },
    });
    if (!business || !isRestaurant(business.type)) {
      throw new BadRequestException('Stamp cards are only for restaurants and cafes.');
    }
  }

  private async assertBusinessAccess(businessId: string, userId: string, _userRole?: string) {
    await this.access.requireStaff(userId, businessId);
  }
}

function canonicalPhone(phone?: string | null) {
  if (!phone) return '';
  try {
    return normalizePhone(phone);
  } catch {
    return '';
  }
}

function isRestaurant(type?: BusinessType | null) {
  return type === BusinessType.RESTAURANT || type === BusinessType.CAFE;
}
