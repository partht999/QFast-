import { Injectable, NotFoundException, BadRequestException, ConflictException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EventsGateway } from '../events/events.gateway';
import { LoyaltyService } from '../loyalty/loyalty.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { IntegrationProvider, OrderSource, OrderStatus, PaymentStatus, Prisma } from '@prisma/client';
import { isCounterPayment, unpaidReason } from './payment-state';
import { visitsAreOpen } from '../business/subscription-access';

@Injectable()
export class OrdersService {
  private readonly orderInclude = {
    items: { include: { menuItem: true } },
    table: true,
    queueToken: true,
    payments: true,
  };

  constructor(
    private prisma: PrismaService,
    private events: EventsGateway,
    private loyalty: LoyaltyService,
  ) {}

  async createPublicOrder(dto: CreateOrderDto) {
    const business = await this.prisma.business.findUnique({
      where: { slug: dto.businessSlug },
      include: { branches: true },
    });
    if (!business) throw new NotFoundException('Restaurant not found');
    const access = await visitsAreOpen(this.prisma, business.id);
    if (!access.open) {
      throw new ForbiddenException('Ordering is paused because this business plan has expired.');
    }

    if (dto.idempotencyKey) {
      const existing = await this.prisma.order.findUnique({
        where: { idempotencyKey: dto.idempotencyKey },
        include: this.orderInclude,
      });
      if (existing) return existing;
    }

    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Order must contain at least one item');
    }
    const lines = await this.pricedLines(business.id, dto.items);
    if (dto.source === OrderSource.TABLE_QR || dto.tableName) {
      return this.createTableOrder(business, dto, lines);
    }
    let queueTokenId = dto.queueTokenId;
    let tokenNumber: number | undefined;
    let tokenStatus: string | undefined;
    let tableId: string | undefined;
    if (queueTokenId) {
      const qToken = await this.prisma.queueToken.findUnique({ where: { id: queueTokenId } });
      if (qToken && qToken.queueId) {
        const queue = await this.prisma.queue.findUnique({
          where: { id: qToken.queueId },
          select: { businessId: true },
        });
        if (queue?.businessId !== business.id) queueTokenId = undefined;
      }
      if (qToken && queueTokenId) {
        tokenNumber = qToken.tokenNumber;
        tokenStatus = qToken.status;
        if (!dto.customerName) dto.customerName = qToken.customerName;
        if (!dto.customerPhone) dto.customerPhone = qToken.customerPhone;
        const called = qToken.status === 'CALLED' || qToken.status === 'SEATED';
        if (called && qToken.tableId) tableId = qToken.tableId;
      } else {
        queueTokenId = undefined;
      }
    }

    if (queueTokenId) {
      const open = await this.prisma.order.findFirst({
        where: {
          queueTokenId,
          status: { notIn: [OrderStatus.COMPLETED, OrderStatus.CANCELLED, OrderStatus.REJECTED] },
        },
        orderBy: { createdAt: 'desc' },
      });
      if (open) {
        return this.appendToOrder(open.id, lines, dto.tipAmount || 0, tokenStatus, tableId);
      }
    }

    const orderSource = queueTokenId ? OrderSource.QUEUE_PREORDER : OrderSource.TAKEAWAY;
    if (!queueTokenId && dto.customerPhone) {
      const digits = dto.customerPhone.replace(/\D/g, '');
      const phone = digits.length > 10 ? digits.slice(-10) : digits;
      const openTakeaway = await this.prisma.order.findFirst({
        where: {
          businessId: business.id,
          source: OrderSource.TAKEAWAY,
          customerPhone: phone,
          status: { notIn: [OrderStatus.COMPLETED, OrderStatus.CANCELLED, OrderStatus.REJECTED] },
        },
        orderBy: { createdAt: 'desc' },
      });
      if (openTakeaway) return this.appendToOrder(openTakeaway.id, lines, dto.tipAmount || 0);
    }
    const fallbackCustomerName = queueTokenId
      ? tokenNumber
        ? `Queue #${tokenNumber}`
        : 'Queue guest'
      : 'Takeaway guest';
    const totals = this.totalsFor(lines, dto.tipAmount || 0);
    const { subtotal, taxAmount, tipAmount, totalAmount } = totals;

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

    let order;
    try {
      order = await this.prisma.order.create({
      data: {
        businessId: business.id,
        branchId: business.branches[0]?.id,
        tableId,
        queueTokenId,
        customerId,
        customerName: dto.customerName || fallbackCustomerName,
        customerPhone: dto.customerPhone,
        source: orderSource,
        status: OrderStatus.PENDING,
        subtotal: new Prisma.Decimal(subtotal),
        taxAmount: new Prisma.Decimal(taxAmount),
        tipAmount: new Prisma.Decimal(tipAmount),
        discountAmount: new Prisma.Decimal(0),
        totalAmount: new Prisma.Decimal(totalAmount),
        specialInstructions: dto.specialInstructions,
        idempotencyKey: dto.idempotencyKey,
        items: {
          create: lines.map((line) => ({
            menuItemId: line.item.menuItemId,
            variantId: line.item.variantId,
            quantity: line.item.quantity,
            unitPrice: new Prisma.Decimal(line.unitPrice),
            addonsTotal: new Prisma.Decimal(0),
            totalPrice: new Prisma.Decimal(line.totalPrice),
            specialNote: line.item.specialNote,
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
      include: this.orderInclude,
    });
    } catch (error) {
      if (
        dto.idempotencyKey &&
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const existing = await this.prisma.order.findUnique({
          where: { idempotencyKey: dto.idempotencyKey },
          include: this.orderInclude,
        });
        if (existing) return existing;
      }
      throw error;
    }

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
            address: true,
            phone: true,
            logoUrl: true,
            instagramHandle: true,
            gstin: true,
          },
        },
        table: true,
        queueToken: true,
        items: {
          include: { menuItem: true },
        },
        payments: true,
      },
    });

    if (!order) throw new NotFoundException('Order not found');
    const loyalty = order.customerPhone
      ? await this.loyalty.getCustomerBalance(order.business.slug, order.customerPhone)
      : null;
    return { ...order, loyalty };
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
        queueToken: true,
        items: {
          include: { menuItem: true },
        },
        payments: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getRecentCompletedOrders(businessId: string) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    return this.prisma.order.findMany({
      where: {
        businessId,
        status: OrderStatus.COMPLETED,
        updatedAt: { gte: todayStart },
      },
      include: {
        table: true,
        queueToken: true,
        items: {
          include: { menuItem: true },
        },
        payments: true,
      },
      orderBy: { updatedAt: 'desc' },
      take: 20,
    });
  }

  async updateOrderStatus(orderId: string, status: OrderStatus) {
    const current = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { queueToken: { select: { status: true, tokenNumber: true } } },
    });
    if (!current) throw new NotFoundException('Order not found');
    const held =
      current.queueToken &&
      current.queueToken.status !== 'CALLED' &&
      current.queueToken.status !== 'SEATED';
    if (held && status !== OrderStatus.CANCELLED && status !== OrderStatus.PENDING) {
      throw new ConflictException(
        `Pre-order #${current.queueToken?.tokenNumber} stays on hold until that party is called.`,
      );
    }
    if (status === OrderStatus.COMPLETED) {
      const payments = await this.prisma.payment.findMany({
        where: { orderId },
        select: { status: true, method: true },
      });
      const reason = unpaidReason(payments);
      if (reason) throw new ConflictException(reason);
    }

    let order: Prisma.OrderGetPayload<{
      include: { table: true; items: { include: { menuItem: true } } };
    }>;
    try {
      order = await this.prisma.$transaction(async (tx) => {
        return tx.order.update({
          where: { id: orderId },
          data: { status },
          include: {
            table: true,
            items: { include: { menuItem: true } },
          },
        });
      });
    } catch (error) {
      if (
        status !== OrderStatus.COMPLETED ||
        !(error instanceof Prisma.PrismaClientKnownRequestError) ||
        error.code !== 'P2002'
      ) {
        throw error;
      }

      const priorCredit = await this.prisma.loyaltyTransaction.findFirst({
        where: { orderId, type: 'EARN' },
        select: { id: true },
      });
      if (!priorCredit) throw error;

      const alreadyCompleted = await this.prisma.order.findUnique({
        where: { id: orderId },
        include: {
          table: true,
          items: { include: { menuItem: true } },
        },
      });
      if (!alreadyCompleted) throw error;
      order = alreadyCompleted;
    }

    this.events.emitOrderUpdate(order.businessId, order.id, {
      type: 'ORDER_STATUS_CHANGED',
      order,
    });

    if (status === OrderStatus.COMPLETED && order.customerPhone) {
      await this.loyalty.awardVisit({
        businessId: order.businessId,
        phone: order.customerPhone,
        name: order.customerName,
        sourceKey: order.queueTokenId ? `token:${order.queueTokenId}` : `order:${order.id}`,
        orderId: order.id,
      });
    }

    return order;
  }

  async markOrderPaid(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { queueToken: { select: { status: true } }, payments: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (['PENDING', 'ACCEPTED', 'PREPARING'].includes(order.status)) {
      throw new ConflictException('The kitchen is still cooking this order.');
    }
    const pending = order.payments.filter((payment) => payment.status === PaymentStatus.PENDING);
    const counter = pending.filter((payment) => isCounterPayment(payment.method));
    if (!counter.length) {
      throw new ConflictException(
        pending.length
          ? 'This online payment has not been captured. It cannot be marked paid at the counter.'
          : 'This bill is already paid.',
      );
    }
    await this.prisma.payment.updateMany({
      where: { id: { in: counter.map((payment) => payment.id) } },
      data: { status: PaymentStatus.PAID, paidAt: new Date() },
    });
    return this.prisma.order.findUnique({ where: { id: orderId }, include: this.orderInclude });
  }

  async customerPay(orderId: string, method: 'CASH' | 'UPI_AT_COUNTER') {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { payments: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (['COMPLETED', 'CANCELLED', 'REJECTED'].includes(order.status)) {
      throw new ConflictException('This bill is already closed.');
    }
    const pending = order.payments.filter((payment) => payment.status !== PaymentStatus.PAID);
    if (!order.payments.length) {
      await this.prisma.payment.create({
        data: {
          orderId,
          businessId: order.businessId,
          amount: order.totalAmount,
          method,
          status: PaymentStatus.PAID,
          paidAt: new Date(),
        },
      });
    } else if (pending.length) {
      await this.prisma.payment.updateMany({
        where: { id: { in: pending.map((payment) => payment.id) } },
        data: { method, status: PaymentStatus.PAID, paidAt: new Date() },
      });
    }
    return this.getPublicOrder(orderId);
  }

  async customerCloseOrder(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { payments: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.queueTokenId) {
      throw new ConflictException('The restaurant closes this bill when the visit is finished.');
    }
    if (['PENDING', 'ACCEPTED', 'PREPARING'].includes(order.status)) {
      throw new ConflictException('The kitchen is still cooking. Close the bill when the food is ready.');
    }
    const reason = unpaidReason(order.payments);
    if (!order.payments.length || reason) {
      throw new ConflictException(reason || 'Pay the bill before closing it.');
    }
    return this.updateOrderStatus(orderId, OrderStatus.COMPLETED);
  }

  async requestStaffHelp(orderId: string, kind: 'waiter' | 'bill') {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { table: true, queueToken: true, business: { select: { id: true, name: true } } },
    });
    if (!order) throw new NotFoundException('Order not found');
    const where = order.table?.name
      ? order.table.name
      : order.queueToken
        ? `party #${order.queueToken.tokenNumber}`
        : 'Takeaway';
    const subject = kind === 'bill' ? 'Bill request' : 'Guest needs help';
    const body =
      kind === 'bill'
        ? `${where} asked for the bill.`
        : `${where} is asking for someone to come over.`;
    const alert = await this.prisma.notification.create({
      data: {
        businessId: order.businessId,
        channel: 'WEB_PUSH',
        category: 'TRANSACTIONAL',
        templateKey: 'staff-alert',
        subject,
        body,
        metadata: { kind, orderId, tokenNumber: order.queueToken?.tokenNumber || null },
      },
    });
    this.events.emitOrderUpdate(order.businessId, order.id, { type: 'STAFF_HELP', alert });
    return { ok: true };
  }

  async ingestPartnerOrder(
    slug: string,
    input: {
      provider: 'SWIGGY' | 'ZOMATO';
      secret: string;
      externalId: string;
      customerName?: string;
      items: Array<{ name: string; quantity: number; price: number }>;
    },
  ) {
    const business = await this.prisma.business.findUnique({ where: { slug }, include: { branches: true } });
    if (!business) throw new NotFoundException('Restaurant not found');
    const access = await visitsAreOpen(this.prisma, business.id);
    if (!access.open) throw new ForbiddenException('This business plan has expired.');
    const provider = input.provider === 'ZOMATO' ? IntegrationProvider.ZOMATO : IntegrationProvider.SWIGGY;
    const integration = await this.prisma.integration.findUnique({
      where: { businessId_provider: { businessId: business.id, provider } },
    });
    const config = (integration?.config || {}) as { webhookSecret?: string };
    if (!integration?.isActive || !config.webhookSecret || config.webhookSecret !== input.secret) {
      throw new UnauthorizedException('Partner webhook was rejected');
    }
    const externalId = input.externalId.trim();
    if (!externalId) throw new BadRequestException('externalId is required');
    const existing = await this.prisma.externalOrder.findUnique({
      where: { integrationId_externalId: { integrationId: integration.id, externalId } },
    });
    if (existing) {
      const prior = await this.prisma.order.findFirst({
        where: { businessId: business.id, externalOrderId: externalId },
        include: this.orderInclude,
      });
      if (prior) return prior;
    }

    const category = await this.partnerCategory(business.id);
    const lines = [];
    for (const item of input.items || []) {
      const name = item.name?.trim();
      if (!name || !item.quantity) continue;
      const price = Math.max(0, Number(item.price) || 0);
      let menuItem = await this.prisma.menuItem.findFirst({
        where: { categoryId: category.id, name: { equals: name, mode: 'insensitive' } },
      });
      if (!menuItem) {
        menuItem = await this.prisma.menuItem.create({
          data: { categoryId: category.id, name, price, description: `${input.provider} dish`, isAvailable: true },
        });
      }
      lines.push({ menuItem, quantity: item.quantity, price });
    }
    if (!lines.length) throw new BadRequestException('Add at least one dish');
    const subtotal = lines.reduce((sum, line) => sum + line.price * line.quantity, 0);
    const taxAmount = Math.round(subtotal * 0.05 * 100) / 100;
    const totalAmount = Math.round((subtotal + taxAmount) * 100) / 100;
    const order = await this.prisma.order.create({
      data: {
        businessId: business.id,
        branchId: business.branches[0]?.id,
        customerName: input.customerName || input.provider,
        source: OrderSource.INTEGRATION,
        status: OrderStatus.PENDING,
        externalOrderId: externalId,
        subtotal,
        taxAmount,
        tipAmount: 0,
        discountAmount: 0,
        totalAmount,
        specialInstructions: `${input.provider} #${externalId}`,
        items: {
          create: lines.map((line) => ({
            menuItemId: line.menuItem.id,
            quantity: line.quantity,
            unitPrice: line.price,
            addonsTotal: 0,
            totalPrice: line.price * line.quantity,
            status: OrderStatus.PENDING,
          })),
        },
        payments: {
          create: { businessId: business.id, amount: totalAmount, method: 'UPI_AT_COUNTER', status: PaymentStatus.PENDING },
        },
      },
      include: this.orderInclude,
    });
    await this.prisma.externalOrder.upsert({
      where: { integrationId_externalId: { integrationId: integration.id, externalId } },
      update: { processedAt: new Date() },
      create: { integrationId: integration.id, externalId, source: input.provider, rawPayload: input as object, processedAt: new Date() },
    });
    this.events.emitNewOrder(business.id, order);
    return order;
  }

  private async partnerCategory(businessId: string) {
    const menu = await this.prisma.menu.findFirst({ where: { businessId, isDefault: true } });
    if (!menu) throw new BadRequestException('Create a menu before connecting delivery partners');
    const existing = await this.prisma.menuCategory.findFirst({ where: { menuId: menu.id, name: 'Partner orders' } });
    if (existing) return existing;
    return this.prisma.menuCategory.create({
      data: { menuId: menu.id, name: 'Partner orders', description: 'Dishes received from Swiggy or Zomato. Hidden from the QR menu.', isActive: false },
    });
  }

  private async createTableOrder(
    business: { id: string; branches: { id: string }[] },
    dto: CreateOrderDto,
    lines: Awaited<ReturnType<OrdersService['pricedLines']>>,
  ) {
    const tableName = (dto.tableName || '').trim();
    const table = await this.prisma.table.findFirst({
      where: { businessId: business.id, isActive: true, name: { equals: tableName, mode: 'insensitive' } },
    });
    if (!table) throw new BadRequestException('This table QR is not active. Ask the counter to reprint it.');
    const digits = (dto.customerPhone || '').replace(/\D/g, '');
    const phone = digits.length > 10 ? digits.slice(-10) : digits;
    if (!/^[6-9]\d{9}$/.test(phone)) throw new BadRequestException('Enter a 10-digit mobile number so your stamps are saved.');
    if (!dto.customerName?.trim()) throw new BadRequestException('Enter your name.');

    const open = await this.prisma.order.findFirst({
      where: { tableId: table.id, status: { notIn: [OrderStatus.COMPLETED, OrderStatus.CANCELLED, OrderStatus.REJECTED] } },
      orderBy: { createdAt: 'desc' },
    });
    if (open) return this.appendToOrder(open.id, lines, dto.tipAmount || 0, 'SEATED', table.id);

    const customer = await this.prisma.customer.upsert({
      where: { phone },
      update: { name: dto.customerName.trim() },
      create: { phone, name: dto.customerName.trim() },
    });
    const totals = this.totalsFor(lines, dto.tipAmount || 0);
    const order = await this.prisma.order.create({
      data: {
        businessId: business.id,
        branchId: business.branches[0]?.id,
        tableId: table.id,
        customerId: customer.id,
        customerName: dto.customerName.trim(),
        customerPhone: phone,
        source: OrderSource.TABLE_QR,
        status: OrderStatus.PENDING,
        subtotal: new Prisma.Decimal(totals.subtotal),
        taxAmount: new Prisma.Decimal(totals.taxAmount),
        tipAmount: new Prisma.Decimal(totals.tipAmount),
        discountAmount: new Prisma.Decimal(0),
        totalAmount: new Prisma.Decimal(totals.totalAmount),
        specialInstructions: dto.specialInstructions,
        idempotencyKey: dto.idempotencyKey,
        items: {
          create: lines.map((line) => ({
            menuItemId: line.item.menuItemId,
            variantId: line.item.variantId,
            quantity: line.item.quantity,
            unitPrice: new Prisma.Decimal(line.unitPrice),
            addonsTotal: new Prisma.Decimal(0),
            totalPrice: new Prisma.Decimal(line.totalPrice),
            specialNote: line.item.specialNote,
            status: OrderStatus.PENDING,
          })),
        },
        payments: {
          create: {
            businessId: business.id,
            amount: new Prisma.Decimal(totals.totalAmount),
            method: dto.paymentMethod,
            status: PaymentStatus.PENDING,
          },
        },
      },
      include: this.orderInclude,
    });
    this.events.emitNewOrder(business.id, order);
    return order;
  }

  private async pricedLines(businessId: string, items: CreateOrderDto['items']) {
    const lines = [];
    for (const item of items) {
      const menuItem = await this.prisma.menuItem.findFirst({
        where: { id: item.menuItemId, isAvailable: true, category: { menu: { businessId } } },
      });
      if (!menuItem) throw new BadRequestException('One of those dishes is no longer available.');
      const unitPrice = Number(menuItem.price);
      lines.push({
        item,
        unitPrice,
        totalPrice: Math.round(unitPrice * item.quantity * 100) / 100,
      });
    }
    return lines;
  }

  private totalsFor(
    lines: { totalPrice: number }[],
    tipInput: number,
    previous?: { subtotal: number; tip: number },
  ) {
    const added = lines.reduce((sum, line) => sum + line.totalPrice, 0);
    const subtotal = Math.round(((previous?.subtotal || 0) + added) * 100) / 100;
    const tipAmount = Math.min(subtotal, Math.max(0, (previous?.tip || 0) + Number(tipInput || 0)));
    const taxAmount = Math.round(subtotal * 0.05 * 100) / 100;
    const totalAmount = Math.round((subtotal + taxAmount + tipAmount) * 100) / 100;
    return { subtotal, taxAmount, tipAmount, totalAmount };
  }

  private async appendToOrder(
    orderId: string,
    lines: Awaited<ReturnType<OrdersService['pricedLines']>>,
    tipAmount: number,
    tokenStatus?: string,
    tableId?: string,
  ) {
    const open = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!open) throw new NotFoundException('Order not found');
    const called = tokenStatus === 'CALLED' || tokenStatus === 'SEATED';
    const totals = this.totalsFor(lines, tipAmount, {
      subtotal: Number(open.subtotal),
      tip: Number(open.tipAmount),
    });
    let status = open.status;
    if (!called) status = OrderStatus.PENDING;
    else if (status === OrderStatus.READY) status = OrderStatus.PREPARING;

    const order = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        tableId: tableId || open.tableId,
        status,
        subtotal: new Prisma.Decimal(totals.subtotal),
        taxAmount: new Prisma.Decimal(totals.taxAmount),
        tipAmount: new Prisma.Decimal(totals.tipAmount),
        totalAmount: new Prisma.Decimal(totals.totalAmount),
        items: {
          create: lines.map((line) => ({
            menuItemId: line.item.menuItemId,
            variantId: line.item.variantId,
            quantity: line.item.quantity,
            unitPrice: new Prisma.Decimal(line.unitPrice),
            addonsTotal: new Prisma.Decimal(0),
            totalPrice: new Prisma.Decimal(line.totalPrice),
            specialNote: line.item.specialNote,
            status,
          })),
        },
        payments: {
          updateMany: {
            where: { orderId },
            data: {
              amount: new Prisma.Decimal(totals.totalAmount),
              status: PaymentStatus.PENDING,
              paidAt: null,
            },
          },
        },
      },
      include: this.orderInclude,
    });
    this.events.emitOrderUpdate(order.businessId, order.id, { type: 'ORDER_ITEMS_ADDED', order });
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
      this.prisma.queueToken.findMany({
        where: {
          tableId: { not: null },
          status: { in: ['CALLED', 'SEATED'] },
          queue: { businessId },
        },
        select: { tableId: true },
        distinct: ['tableId'],
      }),
      this.prisma.order.findMany({
        where: { businessId },
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          table: true,
          queueToken: true,
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
      occupiedTables: activeTables.length,
      totalTables,
      recentOrders,
    };
  }
}
