import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateFeedbackDto, UpdateGoogleSettingsDto } from './dto/create-feedback.dto';
import { FeedbackStatus } from '@prisma/client';
import { reviewFieldsFromInputResolved } from './google-place';
import { AccessService } from '../access/access.service';
import { STAFF_ROLES } from '../access/access.rules';
import { isUniqueConflict } from '../../common/customer-identity';
import { normalizePhone } from '../../common/phone';
import { assertFeedbackEligible, feedbackSummary } from './feedback-rules';

@Injectable()
export class ReviewsService {
  constructor(
    private prisma: PrismaService,
    private access: AccessService,
  ) {}

  async submitFeedback(dto: CreateFeedbackDto) {
    const business = await this.prisma.business.findUnique({
      where: { slug: dto.businessSlug },
    });
    if (!business) throw new NotFoundException('Restaurant not found');

    if (!dto.orderId) throw new BadRequestException('Feedback has to be about a completed order.');
    const order = await this.prisma.order.findUnique({ where: { id: dto.orderId } });
    let phone: string | undefined;
    let orderPhone: string | undefined;
    try {
      if (dto.customerPhone) phone = normalizePhone(dto.customerPhone);
      if (order?.customerPhone) orderPhone = normalizePhone(order.customerPhone);
    } catch {
      throw new BadRequestException('Enter a valid phone number');
    }
    let dedupeKey: string;
    try {
      dedupeKey = assertFeedbackEligible({
        order: order
          ? { id: order.id, businessId: order.businessId, status: order.status, customerPhone: order.customerPhone }
          : null,
        businessId: business.id,
        phone,
        orderPhone,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Feedback was not accepted.';
      if (message.includes('not from this business')) throw new NotFoundException(message);
      throw new BadRequestException(message);
    }
    const customer = phone ? await this.prisma.customer.findFirst({ where: { phone: { in: [phone, orderPhone].filter(Boolean) as string[] } } }) : null;

    let feedback;
    try {
      feedback = await this.prisma.feedback.create({
        data: {
          businessId: business.id,
          customerId: customer?.id,
          orderId: dto.orderId,
          rating: dto.rating,
          tags: (dto.tags || []).slice(0, 8),
          comment: dto.comment?.slice(0, 1000),
          wantsContact: dto.wantsContact ?? false,
          status: FeedbackStatus.NEW,
          dedupeKey,
        },
      });
    } catch (error) {
      if (isUniqueConflict(error)) throw new ConflictException('Feedback was already submitted for this order.');
      throw error;
    }

    return {
      success: true,
      feedbackId: feedback.id,
      googleReviewUrl: business.googleReviewUrl || null,
    };
  }

  async getBusinessFeedback(businessId: string, userId: string) {
    await this.access.requireStaff(userId, businessId, STAFF_ROLES.manager);
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
      ...feedbackSummary(stats._count.rating, stats._avg.rating),
      items,
    };
  }

  async updateFeedbackStatus(id: string, status: FeedbackStatus, userId: string) {
    await this.access.requireFeedback(userId, id, STAFF_ROLES.manager);
    return this.prisma.feedback.update({
      where: { id },
      data: {
        status,
        resolvedAt: status === FeedbackStatus.RESOLVED ? new Date() : null,
      },
    });
  }

  async updateGoogleSettings(businessId: string, dto: UpdateGoogleSettingsDto, userId: string) {
    await this.access.requireStaff(userId, businessId, STAFF_ROLES.manager);
    const fields = await reviewFieldsFromInputResolved(dto.googlePlaceId);
    if (!fields) {
      return this.prisma.business.findUnique({ where: { id: businessId } });
    }

    return this.prisma.business.update({
      where: { id: businessId },
      data: fields,
    });
  }
}

