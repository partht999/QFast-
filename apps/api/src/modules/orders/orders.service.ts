import { Injectable, Logger, NotFoundException, BadRequestException, ConflictException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EventsGateway } from '../events/events.gateway';
import { LoyaltyService } from '../loyalty/loyalty.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { IntegrationProvider, OrderSource, OrderStatus, PaymentStatus, Prisma } from '@prisma/client';
import { billDueReason, counterMethod } from './payment-state';
import { visitsAreOpen } from '../business/subscription-access';
import { AccessService } from '../access/access.service';
import { STAFF_ROLES } from '../access/access.rules';
import { resolveCustomer } from '../../common/customer-identity';
import { isIndianMobile, normalizePhone, phoneLookupVariants } from '../../common/phone';
import { businessDayRange } from '../../common/time';
import { isUniqueConflict } from '../../common/customer-identity';
import { orderTotals, priceCatalogLine, PricedLine, roundMoney } from './pricing';
import { reconcilePayments } from './payment-ledger';
import { parsePartnerOrder, partnerPayloadForStorage, secretsEqual } from './partner-webhook';
import { tableSessionDecision } from './table-session';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);
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
    private access: AccessService,
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
    const customerPhone = dto.customerPhone ? this.canonicalPhone(dto.customerPhone) : undefined;
    if (!queueTokenId && customerPhone) {
      const openTakeaway = await this.prisma.order.findFirst({
        where: {
          businessId: business.id,
          source: OrderSource.TAKEAWAY,
          customerPhone: { in: phoneLookupVariants(customerPhone) },
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

    let customerId: string | undefined;
    if (customerPhone) {
      const customer = await resolveCustomer(this.prisma, customerPhone, dto.customerName || undefined);
      customerId = customer.id;
      await this.prisma.customerBusiness.upsert({
        where: {
          customerId_businessId: {
            customerId: customer.id,
            businessId: business.id,
          },
        },
        update: {},
        create: {
          customerId: customer.id,
          businessId: business.id,
          visitCount: 0,
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
        customerPhone,
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
          create: lines.map((line) => this.itemData(line, OrderStatus.PENDING)),
        },
        payments: {
          create: {
            businessId: business.id,
            amount: new Prisma.Decimal(totalAmount),
            method: counterMethod(dto.paymentMethod),
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

  async getActiveOrders(businessId: string, userId: string) {
    await this.access.requireStaff(userId, businessId, STAFF_ROLES.kitchen);
    return this.prisma.order.findMany({
      where: {
        businessId,
        servedAt: null,
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

  async getRecentCompletedOrders(businessId: string, userId: string) {
    await this.access.requireStaff(userId, businessId, STAFF_ROLES.kitchen);
    const business = await this.prisma.business.findUnique({ where: { id: businessId }, select: { timezone: true } });
    const today = businessDayRange(business?.timezone);

    return this.prisma.order.findMany({
      where: {
        businessId,
        servedAt: { not: null },
        status: OrderStatus.READY,
        updatedAt: { gte: today.start, lt: today.end },
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

  async updateOrderStatus(orderId: string, status: OrderStatus, userId: string) {
    await this.access.requireOrder(userId, orderId, STAFF_ROLES.kitchen);
    if (status === OrderStatus.COMPLETED) {
      throw new ConflictException('The front desk closes the bill. The kitchen stops at served.');
    }
    return this.applyOrderStatus(orderId, status);
  }

  async markServed(orderId: string, userId: string) {
    await this.access.requireOrder(userId, orderId, STAFF_ROLES.kitchen);
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.status !== OrderStatus.READY) {
      throw new ConflictException('Mark the order ready before it leaves the kitchen.');
    }
    return this.prisma.order.update({
      where: { id: orderId },
      data: { servedAt: new Date() },
      include: { table: true, items: { include: { menuItem: true } } },
    });
  }

  async getOpenBills(businessId: string, userId: string) {
    await this.access.requireStaff(userId, businessId, STAFF_ROLES.floor);
    return this.prisma.order.findMany({
      where: {
        businessId,
        status: { notIn: [OrderStatus.COMPLETED, OrderStatus.CANCELLED, OrderStatus.REJECTED] },
      },
      include: {
        table: true,
        queueToken: true,
        items: { include: { menuItem: true } },
        payments: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async closeBill(orderId: string, userId: string) {
    await this.access.requireOrder(userId, orderId, STAFF_ROLES.floor);
    return this.applyOrderStatus(orderId, OrderStatus.COMPLETED);
  }

  private async applyOrderStatus(orderId: string, status: OrderStatus) {
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
    if (status === OrderStatus.COMPLETED && !current.servedAt) {
      throw new ConflictException('The kitchen has not marked this served yet.');
    }
    if (status === OrderStatus.COMPLETED) {
      const payments = await this.prisma.payment.findMany({
        where: { orderId },
        select: { status: true, method: true, amount: true },
      });
      const reason = billDueReason(Number(current.totalAmount), payments);
      if (reason) throw new ConflictException(reason);
    }

    const order = await this.prisma.$transaction(async (tx) => {
      const fresh = await tx.order.findUnique({ where: { id: orderId }, include: { payments: true } });
      if (!fresh) throw new NotFoundException('Order not found');
      if (status === OrderStatus.COMPLETED && fresh.status === OrderStatus.COMPLETED) {
        return tx.order.findUniqueOrThrow({
          where: { id: orderId },
          include: { table: true, items: { include: { menuItem: true } } },
        });
      }
      if (status === OrderStatus.COMPLETED) {
        const reason = billDueReason(Number(fresh.totalAmount), fresh.payments);
        if (reason) throw new ConflictException(reason);
      }
      const updated = await tx.order.update({
        where: { id: orderId },
        data: {
          status,
          ...(status === OrderStatus.PENDING ||
          status === OrderStatus.ACCEPTED ||
          status === OrderStatus.PREPARING ||
          status === OrderStatus.READY
            ? { servedAt: null }
            : {}),
        },
        include: { table: true, items: { include: { menuItem: true } } },
      });
      if (status === OrderStatus.COMPLETED && fresh.customerPhone) {
        await this.loyalty.applyCompletion(tx, {
          businessId: fresh.businessId,
          phone: fresh.customerPhone,
          name: fresh.customerName,
          visitKey: fresh.queueTokenId ? `token:${fresh.queueTokenId}` : `order:${fresh.id}`,
          orderId: fresh.id,
          subtotal: Number(fresh.subtotal),
          spend: Number(fresh.totalAmount),
        });
      }
      return updated;
    });

    this.events.emitOrderUpdate(order.businessId, order.id, {
      type: 'ORDER_STATUS_CHANGED',
      order,
    });

    return order;
  }

  async completeFromQueue(orderId: string) {
    return this.applyOrderStatus(orderId, OrderStatus.COMPLETED);
  }

  async markOrderPaid(orderId: string, userId: string) {
    await this.access.requireOrder(userId, orderId, STAFF_ROLES.floor);
    await this.collectBill(orderId, undefined, { requireReady: true });
    return this.prisma.order.findUnique({ where: { id: orderId }, include: this.orderInclude });
  }

  async customerPay(orderId: string, method: 'CASH' | 'CARD_AT_COUNTER' | 'UPI_AT_COUNTER') {
    const label = method === 'CASH' ? 'cash' : method === 'CARD_AT_COUNTER' ? 'card' : 'UPI';
    await this.requestStaffHelp(orderId, 'bill', `They say they can pay by ${label}. Confirm the money before closing the bill.`);
    return { ok: true, paid: false };
  }

  async collectBill(
    orderId: string,
    method?: string | null,
    options?: { requireReady?: boolean },
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { payments: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (['COMPLETED', 'CANCELLED', 'REJECTED'].includes(order.status)) {
      throw new ConflictException('This bill is already closed.');
    }
    if (options?.requireReady && ['PENDING', 'ACCEPTED', 'PREPARING'].includes(order.status)) {
      throw new ConflictException('The kitchen is still cooking. Collect payment when the food is ready.');
    }
    if (!billDueReason(Number(order.totalAmount), order.payments)) return order;
    const open = order.payments.find((payment) => payment.status === 'PENDING' || payment.status === 'FAILED');
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${order.id} FOR UPDATE`;
      const fresh = await tx.order.findUnique({ where: { id: order.id }, include: { payments: true } });
      if (!fresh) throw new NotFoundException('Order not found');
      if (['COMPLETED', 'CANCELLED', 'REJECTED'].includes(fresh.status)) {
        throw new ConflictException('This bill is already closed.');
      }
      const pending = fresh.payments.find((payment) => payment.status === 'PENDING' || payment.status === 'FAILED');
      await this.applyPaymentPlan(tx, fresh, counterMethod(method || pending?.method || open?.method), true);
    });
    return this.prisma.order.findUnique({ where: { id: orderId }, include: { payments: true } });
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
    const reason = billDueReason(Number(order.totalAmount), order.payments);
    if (reason) throw new ConflictException(reason);
    return this.applyOrderStatus(orderId, OrderStatus.COMPLETED);
  }

  async requestStaffHelp(orderId: string, kind: 'waiter' | 'bill', detail?: string) {
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
        ? `${where} asked for the bill. ${detail || ''}`.trim()
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

  async ingestPartnerOrder(slug: string, input: { secret: string; body: unknown }) {
    let parsed;
    try {
      parsed = parsePartnerOrder(input.body);
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : 'Partner payload is invalid.');
    }
    const business = await this.prisma.business.findUnique({ where: { slug }, include: { branches: true } });
    if (!business) throw new NotFoundException('Restaurant not found');
    const access = await visitsAreOpen(this.prisma, business.id);
    if (!access.open) throw new ForbiddenException('This business plan has expired.');
    const provider = parsed.provider === 'ZOMATO' ? IntegrationProvider.ZOMATO : IntegrationProvider.SWIGGY;
    const integration = await this.prisma.integration.findUnique({
      where: { businessId_provider: { businessId: business.id, provider } },
    });
    const config = (integration?.config || {}) as { webhookSecret?: string };
    const stored = typeof config.webhookSecret === 'string' ? config.webhookSecret : '';
    const authorized = Boolean(integration?.isActive && stored && secretsEqual(stored, input.secret || ''));
    if (!authorized || !integration) {
      this.logger.warn(`Partner webhook rejected for ${slug} (${parsed.provider})`);
      throw new UnauthorizedException('Partner webhook was rejected');
    }

    const prior = await this.prisma.order.findFirst({
      where: { businessId: business.id, externalOrderId: parsed.externalId, externalSource: parsed.provider },
      include: this.orderInclude,
    });
    if (prior) return prior;

    const lines: PricedLine[] = [];
    for (const item of parsed.items) {
      const matches = await this.prisma.menuItem.findMany({
        where: {
          name: { equals: item.name, mode: 'insensitive' },
          category: { menu: { businessId: business.id } },
        },
        include: { variants: true, addons: true },
      });
      if (matches.length !== 1) {
        this.logger.warn(`Partner item not mapped business=${business.id} provider=${parsed.provider} externalId=${parsed.externalId}`);
        throw new BadRequestException(`No single menu item matches "${item.name}".`);
      }
      const menuItem = matches[0];
      if (!menuItem.isAvailable) throw new BadRequestException(`${menuItem.name} is not available.`);
      if (Math.abs(roundMoney(Number(menuItem.price)) - item.price) > 0.009) {
        throw new BadRequestException(`Price for ${item.name} does not match the menu.`);
      }
      lines.push(priceCatalogLine(
        {
          id: menuItem.id,
          price: Number(menuItem.price),
          taxRate: Number(menuItem.taxRate),
          variants: [],
          addons: [],
        },
        { quantity: item.quantity },
      ));
    }
    const totals = this.totalsFor(lines, 0);
    const storedPayload = partnerPayloadForStorage(parsed);
    try {
      const order = await this.prisma.$transaction(async (tx) => {
        await tx.externalOrder.create({
          data: {
            integrationId: integration.id,
            externalId: parsed.externalId,
            source: parsed.provider,
            rawPayload: storedPayload,
          },
        });
        const created = await tx.order.create({
          data: {
            businessId: business.id,
            branchId: business.branches[0]?.id,
            customerName: parsed.customerName || parsed.provider,
            source: OrderSource.INTEGRATION,
            status: OrderStatus.PENDING,
            externalOrderId: parsed.externalId,
            externalSource: parsed.provider,
            idempotencyKey: `partner:${integration.id}:${parsed.externalId}`,
            subtotal: new Prisma.Decimal(totals.subtotal),
            taxAmount: new Prisma.Decimal(totals.taxAmount),
            tipAmount: new Prisma.Decimal(0),
            discountAmount: new Prisma.Decimal(0),
            totalAmount: new Prisma.Decimal(totals.totalAmount),
            specialInstructions: `${parsed.provider} #${parsed.externalId}`,
            items: { create: lines.map((line) => this.itemData(line, OrderStatus.PENDING)) },
            payments: {
              create: {
                businessId: business.id,
                amount: new Prisma.Decimal(totals.totalAmount),
                method: 'UPI_AT_COUNTER',
                status: PaymentStatus.PENDING,
              },
            },
          },
          include: this.orderInclude,
        });
        await tx.externalOrder.update({
          where: { integrationId_externalId: { integrationId: integration.id, externalId: parsed.externalId } },
          data: { processedAt: new Date() },
        });
        return created;
      });
      this.events.emitNewOrder(business.id, order);
      return order;
    } catch (error) {
      if (!isUniqueConflict(error)) throw error;
      const replay = await this.prisma.order.findFirst({
        where: { businessId: business.id, externalOrderId: parsed.externalId, externalSource: parsed.provider },
        include: this.orderInclude,
      });
      if (replay) return replay;
      throw error;
    }
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
    const phone = this.canonicalPhone(dto.customerPhone);
    if (!phone || !isIndianMobile(phone)) {
      throw new BadRequestException('Enter a 10-digit mobile number so your stamps are saved.');
    }
    if (!dto.customerName?.trim()) throw new BadRequestException('Enter your name.');

    const customer = await resolveCustomer(this.prisma, phone, dto.customerName.trim());
    const totals = this.totalsFor(lines, dto.tipAmount || 0);
    const outcome = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Table" WHERE id = ${table.id} FOR UPDATE`;
      const open = await tx.order.findFirst({
        where: { tableId: table.id, status: { notIn: [OrderStatus.COMPLETED, OrderStatus.CANCELLED, OrderStatus.REJECTED] } },
        orderBy: { createdAt: 'desc' },
      });
      if (tableSessionDecision(open) === 'append' && open) {
        const order = await this.writeAppend(tx, open.id, lines, dto.tipAmount || 0, 'SEATED', table.id);
        return { appended: true, order };
      }
      const order = await tx.order.create({
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
          create: lines.map((line) => this.itemData(line, OrderStatus.PENDING)),
        },
        payments: {
          create: {
            businessId: business.id,
            amount: new Prisma.Decimal(totals.totalAmount),
            method: counterMethod(dto.paymentMethod),
            status: PaymentStatus.PENDING,
          },
        },
      },
      include: this.orderInclude,
    });
      return { appended: false, order };
    });
    if (outcome.appended) {
      this.events.emitOrderUpdate(outcome.order.businessId, outcome.order.id, { type: 'ORDER_ITEMS_ADDED', order: outcome.order });
    } else {
      this.events.emitNewOrder(business.id, outcome.order);
    }
    return outcome.order;
  }

  private async pricedLines(businessId: string, items: CreateOrderDto['items']) {
    const lines: PricedLine[] = [];
    for (const item of items) {
      const menuItem = await this.prisma.menuItem.findFirst({
        where: { id: item.menuItemId, isAvailable: true, category: { menu: { businessId } } },
        include: { variants: true, addons: true },
      });
      if (!menuItem) throw new BadRequestException('One of those dishes is no longer available.');
      try {
        lines.push(priceCatalogLine(
          {
            id: menuItem.id,
            price: Number(menuItem.price),
            taxRate: Number(menuItem.taxRate),
            variants: menuItem.variants.map((variant) => ({
              id: variant.id,
              name: variant.name,
              price: Number(variant.price),
            })),
            addons: menuItem.addons.map((addon) => ({
              id: addon.id,
              name: addon.name,
              price: Number(addon.price),
              maxSelect: addon.maxSelect,
            })),
          },
          {
            quantity: item.quantity,
            variantId: item.variantId,
            addonIds: item.addonIds,
            specialNote: item.specialNote,
          },
        ));
      } catch (error) {
        throw new BadRequestException(error instanceof Error ? error.message : 'That item could not be priced.');
      }
    }
    return lines;
  }

  private totalsFor(
    lines: PricedLine[],
    tipInput: number,
    previous?: { subtotal: number; tax: number; tip: number },
  ) {
    try {
      return orderTotals(lines, tipInput, previous);
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : 'That bill could not be priced.');
    }
  }

  private itemData(line: PricedLine, status: OrderStatus) {
    return {
      menuItemId: line.menuItemId,
      variantId: line.variantId,
      quantity: line.quantity,
      unitPrice: new Prisma.Decimal(line.unitPrice),
      addonsTotal: new Prisma.Decimal(line.addonsTotal),
      totalPrice: new Prisma.Decimal(line.totalPrice),
      addons: line.snapshot as unknown as Prisma.InputJsonValue,
      specialNote: line.specialNote,
      status,
    };
  }

  private canonicalPhone(raw?: string | null) {
    if (!raw) return undefined;
    try {
      return normalizePhone(raw);
    } catch {
      throw new BadRequestException('Enter a valid phone number');
    }
  }

  private async appendToOrder(
    orderId: string,
    lines: PricedLine[],
    tipAmount: number,
    tokenStatus?: string,
    tableId?: string,
  ) {
    const reopened = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${orderId} FOR UPDATE`;
      return this.writeAppend(tx, orderId, lines, tipAmount, tokenStatus, tableId);
    });
    this.events.emitOrderUpdate(reopened.businessId, reopened.id, { type: 'ORDER_ITEMS_ADDED', order: reopened });
    return reopened;
  }

  private async writeAppend(
    tx: Prisma.TransactionClient,
    orderId: string,
    lines: PricedLine[],
    tipAmount: number,
    tokenStatus?: string,
    tableId?: string,
  ) {
    const open = await tx.order.findUnique({ where: { id: orderId }, include: { payments: true } });
    if (!open) throw new NotFoundException('Order not found');
    if (tableSessionDecision(open) === 'closed') {
      throw new ConflictException('This bill is already closed.');
    }
    const called = tokenStatus === 'CALLED' || tokenStatus === 'SEATED';
    const totals = this.totalsFor(lines, tipAmount, {
      subtotal: Number(open.subtotal),
      tax: Number(open.taxAmount),
      tip: Number(open.tipAmount),
    });
    let status = open.status;
    if (!called) status = OrderStatus.PENDING;
    else if (status === OrderStatus.READY) status = OrderStatus.PREPARING;

    const order = await tx.order.update({
      where: { id: orderId },
      data: {
        tableId: tableId || open.tableId,
        status,
        subtotal: new Prisma.Decimal(totals.subtotal),
        taxAmount: new Prisma.Decimal(totals.taxAmount),
        tipAmount: new Prisma.Decimal(totals.tipAmount),
        totalAmount: new Prisma.Decimal(totals.totalAmount),
        items: { create: lines.map((line) => this.itemData(line, status)) },
      },
      include: this.orderInclude,
    });
    await this.applyPaymentPlan(tx, order, counterMethod(order.payments[0]?.method), false);
    const reopened = await tx.order.findUnique({ where: { id: orderId }, include: this.orderInclude });
    if (!reopened) throw new NotFoundException('Order not found');
    return reopened;
  }

  private async applyPaymentPlan(
    tx: Prisma.TransactionClient,
    order: { id: string; businessId: string; totalAmount: Prisma.Decimal | number | string },
    method: 'CASH' | 'CARD_AT_COUNTER' | 'UPI_AT_COUNTER',
    markPaid: boolean,
  ) {
    const payments = await tx.payment.findMany({ where: { orderId: order.id } });
    let plan;
    try {
      plan = reconcilePayments({
        totalAmount: Number(order.totalAmount),
        payments,
        markPaid,
      });
    } catch (error) {
      throw new ConflictException(error instanceof Error ? error.message : 'Payment could not be updated.');
    }
    if (plan.action === 'noop') return;
    if (plan.action === 'clear-pending') {
      await tx.payment.deleteMany({
        where: { id: { in: plan.pendingIds }, status: { in: ['PENDING', 'FAILED'] }, refunds: { none: {} } },
      });
      return;
    }
    if (plan.retirePendingIds.length) {
      await tx.payment.deleteMany({
        where: {
          id: { in: plan.retirePendingIds },
          status: { in: ['PENDING', 'FAILED'] },
          refunds: { none: {} },
        },
      });
    }
    const data = {
      amount: new Prisma.Decimal(plan.amount),
      method,
      status: plan.markPaid ? PaymentStatus.PAID : PaymentStatus.PENDING,
      paidAt: plan.markPaid ? new Date() : null,
    };
    if (plan.pendingId) {
      const updated = await tx.payment.updateMany({
        where: { id: plan.pendingId, status: { in: ['PENDING', 'FAILED'] } },
        data,
      });
      if (updated.count) return;
    }
    await tx.payment.create({
      data: { orderId: order.id, businessId: order.businessId, ...data },
    });
  }

  async getOverviewStats(businessId: string, userId: string) {
    await this.access.requireStaff(userId, businessId);
    const business = await this.prisma.business.findUnique({ where: { id: businessId }, select: { timezone: true } });
    const today = businessDayRange(business?.timezone);

    const [todayOrders, waitingTokens, activeTables, recentOrders] = await Promise.all([
      this.prisma.order.findMany({
        where: {
          businessId,
          createdAt: { gte: today.start, lt: today.end },
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
          payments: { select: { status: true, method: true, amount: true } },
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
