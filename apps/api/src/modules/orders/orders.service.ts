import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EventsGateway } from '../events/events.gateway';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderStatus, PaymentStatus, Prisma } from '@prisma/client';

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private events: EventsGateway,
  ) {}

  async createPublicOrder(dto: CreateOrderDto) {
    const business = await this.prisma.business.findUnique({
      where: { slug: dto.businessSlug },
      include: { branches: true },
    });
    if (!business) throw new NotFoundException('Restaurant not found');

    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Order must contain at least one item');
    }

    let tableId = dto.tableId;
    if (!tableId && dto.tableName) {
      const table = await this.prisma.table.findFirst({
        where: {
          businessId: business.id,
          name: { equals: dto.tableName, mode: 'insensitive' },
        },
      });
      if (table) tableId = table.id;
    }

    // Compute totals
    let subtotal = 0;
    for (const it of dto.items) {
      subtotal += Number(it.unitPrice) * it.quantity;
    }
    const taxAmount = Math.round(subtotal * 0.05 * 100) / 100; // 5% GST
    const totalAmount = subtotal + taxAmount;

    // Optional customer link
    let customerId: string | undefined;
    if (dto.customerPhone) {
      const customer = await this.prisma.customer.upsert({
        where: { phone: dto.customerPhone },
        update: { name: dto.customerName || undefined },
        create: {
          phone: dto.customerPhone,
          name: dto.customerName || 'Guest',
        },
      });
      customerId = customer.id;

      await this.prisma.customerBusiness.upsert({
        where: {
          customerId_businessId: {
            customerId: customer.id,
            businessId: business.id,
          },
        },
        update: {
          visitCount: { increment: 1 },
          totalSpend: { increment: new Prisma.Decimal(totalAmount) },
          lastVisitAt: new Date(),
        },
        create: {
          customerId: customer.id,
          businessId: business.id,
          visitCount: 1,
          totalSpend: new Prisma.Decimal(totalAmount),
          lastVisitAt: new Date(),
        },
      });
    }

    const order = await this.prisma.order.create({
      data: {
        businessId: business.id,
        branchId: business.branches[0]?.id,
        tableId,
        customerId,
        customerName: dto.customerName || (tableId ? `Table Diner` : 'Takeaway Guest'),
        customerPhone: dto.customerPhone,
        source: dto.source,
        status: OrderStatus.PENDING,
        subtotal: new Prisma.Decimal(subtotal),
        taxAmount: new Prisma.Decimal(taxAmount),
        discountAmount: new Prisma.Decimal(0),
        totalAmount: new Prisma.Decimal(totalAmount),
        specialInstructions: dto.specialInstructions,
        items: {
          create: dto.items.map((item) => ({
            menuItemId: item.menuItemId,
            variantId: item.variantId,
            quantity: item.quantity,
            unitPrice: new Prisma.Decimal(item.unitPrice),
            addonsTotal: new Prisma.Decimal(0),
            totalPrice: new Prisma.Decimal(Number(item.unitPrice) * item.quantity),
            specialNote: item.specialNote,
            status: OrderStatus.PENDING,
          })),
        },
        payments: {
          create: {
            businessId: business.id,
            amount: new Prisma.Decimal(totalAmount),
            method: dto.paymentMethod,
            status: PaymentStatus.PENDING,
          },
        },
      },
      include: {
        items: {
          include: { menuItem: true },
        },
        table: true,
        payments: true,
      },
    });

    // Real-time broadcast to KDS & Staff Dashboard
    this.events.emitNewOrder(business.id, order);

    return order;
  }

  async getPublicOrder(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        business: {
          select: {
            id: true,
            name: true,
            slug: true,
            googleReviewUrl: true,
            googlePlaceId: true,
            currencyCode: true,
          },
        },
        table: true,
        items: {
          include: { menuItem: true },
        },
        payments: true,
      },
    });

    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async getActiveOrders(businessId: string) {
    return this.prisma.order.findMany({
      where: {
        businessId,
        status: {
          in: [
            OrderStatus.PENDING,
            OrderStatus.ACCEPTED,
            OrderStatus.PREPARING,
            OrderStatus.READY,
          ],
        },
      },
      include: {
        table: true,
        items: {
          include: { menuItem: true },
        },
        payments: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async updateOrderStatus(orderId: string, status: OrderStatus) {
    const order = await this.prisma.order.update({
      where: { id: orderId },
      data: { status },
      include: {
        table: true,
        items: { include: { menuItem: true } },
      },
    });

    // If order completed, mark payment as paid if pending at counter
    if (status === OrderStatus.COMPLETED) {
      await this.prisma.payment.updateMany({
        where: { orderId, status: PaymentStatus.PENDING },
        data: { status: PaymentStatus.PAID, paidAt: new Date() },
      });
    }

    this.events.emitOrderUpdate(order.businessId, order.id, {
      type: 'ORDER_STATUS_CHANGED',
      order,
    });

    return order;
  }

  async getOverviewStats(businessId: string) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [todayOrders, waitingTokens, activeTables, recentOrders] = await Promise.all([
      this.prisma.order.findMany({
        where: {
          businessId,
          createdAt: { gte: todayStart },
        },
        select: {
          id: true,
          status: true,
          totalAmount: true,
        },
      }),
      this.prisma.queueToken.count({
        where: {
          queue: { businessId },
          status: 'WAITING',
        },
      }),
      this.prisma.table.count({
        where: {
          businessId,
          isActive: true,
          orders: {
            some: {
              status: {
                in: [
                  OrderStatus.PENDING,
                  OrderStatus.ACCEPTED,
                  OrderStatus.PREPARING,
                  OrderStatus.READY,
                ],
              },
            },
          },
        },
      }),
      this.prisma.order.findMany({
        where: { businessId },
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          table: true,
          items: { include: { menuItem: true } },
        },
      }),
    ]);

    let todayRevenue = 0;
    let completedCount = 0;
    let pendingCount = 0;

    for (const o of todayOrders) {
      if (o.status === OrderStatus.COMPLETED) {
        todayRevenue += Number(o.totalAmount);
        completedCount++;
      } else if (o.status !== OrderStatus.CANCELLED && o.status !== OrderStatus.REJECTED) {
        pendingCount++;
      }
    }

    const totalTables = await this.prisma.table.count({
      where: { businessId, isActive: true },
    });

    return {
      todayRevenue,
      todayTotalOrders: todayOrders.length,
      todayCompletedOrders: completedCount,
      activeOrdersCount: pendingCount,
      waitingQueueCount: waitingTokens,
      occupiedTables: activeTables,
      totalTables,
      recentOrders,
    };
  }
}

