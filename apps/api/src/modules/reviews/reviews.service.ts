import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateFeedbackDto, UpdateGoogleSettingsDto } from './dto/create-feedback.dto';
import { FeedbackStatus } from '@prisma/client';
import { reviewFieldsFromInput } from './google-place';

@Injectable()
export class ReviewsService {
  constructor(private prisma: PrismaService) {}

  async submitFeedback(dto: CreateFeedbackDto) {
    const business = await this.prisma.business.findUnique({
      where: { slug: dto.businessSlug },
    });
    if (!business) throw new NotFoundException('Restaurant not found');

    let customerId: string | undefined;
    if (dto.customerPhone) {
      const customer = await this.prisma.customer.findUnique({
        where: { phone: dto.customerPhone },
      });
      if (customer) customerId = customer.id;
    }

    const feedback = await this.prisma.feedback.create({
      data: {
        businessId: business.id,
        customerId,
        orderId: dto.orderId,
        rating: dto.rating,
        tags: dto.tags || [],
        comment: dto.comment,
        wantsContact: dto.wantsContact ?? false,
        status: FeedbackStatus.NEW,
      },
    });

    return {
      success: true,
      feedbackId: feedback.id,
      googleReviewUrl: business.googleReviewUrl || null,
    };
  }

  async getBusinessFeedback(businessId: string) {
    const [items, stats] = await Promise.all([
      this.prisma.feedback.findMany({
        where: { businessId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      this.prisma.feedback.aggregate({
        where: { businessId },
        _avg: { rating: true },
        _count: { rating: true },
      }),
    ]);

    return {
      averageRating: stats._avg.rating ? Math.round(stats._avg.rating * 10) / 10 : 5.0,
      totalCount: stats._count.rating,
      items,
    };
  }

  async updateFeedbackStatus(id: string, status: FeedbackStatus) {
    return this.prisma.feedback.update({
      where: { id },
      data: {
        status,
        resolvedAt: status === FeedbackStatus.RESOLVED ? new Date() : null,
      },
    });
  }

  async updateGoogleSettings(businessId: string, dto: UpdateGoogleSettingsDto) {
    const fields = reviewFieldsFromInput(dto.googlePlaceId);
    if (!fields) {
      return this.prisma.business.findUnique({ where: { id: businessId } });
    }

    return this.prisma.business.update({
      where: { id: businessId },
      data: fields,
    });
  }
}

