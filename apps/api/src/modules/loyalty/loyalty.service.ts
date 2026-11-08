import {
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
    const business = await this.prisma.business.findUnique({
      where: { slug },
      include: { loyaltyProgram: true },
    });
    if (!business) throw new NotFoundException('Restaurant not found');
    if (!business.loyaltyProgram) {
      return { hasProgram: false, businessName: business.name, points: 0, stamps: 0, transactions: [] };
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

    return {
      hasProgram: true,
      businessName: business.name,
      programType: business.loyaltyProgram.type,
      points: account?.points || 0,
      stamps: account?.stamps || 0,
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
          type: LoyaltyProgramType.POINTS_PER_RUPEE,
          pointsPerRupee: 1.0,
          expiryDays: 365,
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
    return this.prisma.loyaltyProgram.upsert({
      where: { businessId },
      update: {
        type: data.type,
        pointsPerRupee: data.pointsPerRupee,
        expiryDays: data.expiryDays,
      },
      create: {
        businessId,
        type: data.type || LoyaltyProgramType.POINTS_PER_RUPEE,
        pointsPerRupee: data.pointsPerRupee ?? 1,
        expiryDays: data.expiryDays ?? 365,
      },
      include: { rewards: { orderBy: { createdAt: 'desc' } }, tiers: true },
    });
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
