import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { LoyaltyProgramType } from '@prisma/client';

@Injectable()
export class LoyaltyService {
  constructor(private prisma: PrismaService) {}

  async getCustomerBalance(slug: string, phone: string) {
    const business = await this.prisma.business.findUnique({
      where: { slug },
      include: { loyaltyProgram: true },
    });
    if (!business || !business.loyaltyProgram) {
      return { hasProgram: false, points: 0, stamps: 0 };
    }

    const customer = await this.prisma.customer.findUnique({
      where: { phone },
      include: {
        loyaltyAccounts: {
          where: { programId: business.loyaltyProgram.id },
          include: {
            transactions: {
              orderBy: { createdAt: 'desc' },
              take: 5,
            },
          },
        },
      },
    });

    const account = customer?.loyaltyAccounts[0];

    return {
      hasProgram: true,
      programType: business.loyaltyProgram.type,
      points: account?.points || 0,
      stamps: account?.stamps || 0,
      transactions: account?.transactions || [],
    };
  }

  async getProgram(businessId: string) {
    let program = await this.prisma.loyaltyProgram.findUnique({
      where: { businessId },
      include: { rewards: true, tiers: true },
    });

    if (!program) {
      program = await this.prisma.loyaltyProgram.create({
        data: {
          businessId,
          type: LoyaltyProgramType.POINTS_PER_RUPEE,
          pointsPerRupee: 1.0,
          expiryDays: 365,
        },
        include: { rewards: true, tiers: true },
      });
    }

    return program;
  }

  async updateProgram(businessId: string, data: any) {
    return this.prisma.loyaltyProgram.upsert({
      where: { businessId },
      update: {
        type: data.type,
        pointsPerRupee: data.pointsPerRupee,
        stampsPerVisit: data.stampsPerVisit,
        stampsForReward: data.stampsForReward,
        expiryDays: data.expiryDays,
      },
      create: {
        businessId,
        type: data.type || LoyaltyProgramType.POINTS_PER_RUPEE,
        pointsPerRupee: data.pointsPerRupee || 1.0,
        stampsPerVisit: data.stampsPerVisit || 1,
        stampsForReward: data.stampsForReward || 10,
        expiryDays: data.expiryDays || 365,
      },
    });
  }
}

