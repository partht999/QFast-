import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTableDto, UpdateTableDto } from './dto/create-table.dto';
import { OrderStatus, QueueTokenStatus } from '@prisma/client';
import { AccessService } from '../access/access.service';
import { STAFF_ROLES } from '../access/access.rules';

@Injectable()
export class TablesService {
  constructor(
    private prisma: PrismaService,
    private access: AccessService,
  ) {}

  async getTables(businessId: string, userId: string) {
    await this.access.requireStaff(userId, businessId, STAFF_ROLES.floor);
    return this.prisma.table.findMany({
      where: { businessId, isActive: true },
      include: {
        qrCode: true,
        orders: {
          where: {
            status: {
              in: [
                OrderStatus.PENDING,
                OrderStatus.ACCEPTED,
                OrderStatus.PREPARING,
                OrderStatus.READY,
              ],
            },
          },
          select: {
            id: true,
            status: true,
            totalAmount: true,
            createdAt: true,
          },
        },
        queueTokens: {
          where: { status: { in: [QueueTokenStatus.CALLED, QueueTokenStatus.SEATED] } },
          select: { id: true, tokenNumber: true, customerName: true, partySize: true, status: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async createTable(businessId: string, dto: CreateTableDto, userId: string) {
    await this.access.requireStaff(userId, businessId, STAFF_ROLES.floor);
    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
    });
    if (!business) throw new NotFoundException('Business not found');
    const name = dto.name.trim();
    await this.assertNameFree(businessId, name);
    if (dto.branchId) {
      const branch = await this.prisma.businessBranch.findFirst({ where: { id: dto.branchId, businessId } });
      if (!branch) throw new BadRequestException('That branch is not part of this business.');
    }

    const base = `${business.slug}-${name.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
    const taken = await this.prisma.qRCode.findUnique({ where: { slug: base }, select: { id: true } });
    const tableSlug = taken ? `${base}-${randomBytes(3).toString('hex')}` : base;

    const table = await this.prisma.table.create({
      data: {
        businessId,
        branchId: dto.branchId,
        name,
        capacity: dto.capacity,
        qrCode: {
          create: {
            businessId,
            type: 'TABLE',
            slug: tableSlug,
            targetUrl: `/r/${business.slug}/table/${encodeURIComponent(name)}`,
          },
        },
      },
      include: { qrCode: true },
    });
    const qrCode = await this.prisma.qRCode.update({
      where: { id: table.qrCode!.id },
      data: { targetUrl: tableQrUrl(business.slug, name, table.qrCode!.id) },
    });
    return { ...table, qrCode };
  }

  private async assertNameFree(businessId: string, name: string, exceptId?: string) {
    const clash = await this.prisma.table.findFirst({
      where: {
        businessId,
        isActive: true,
        name: { equals: name, mode: 'insensitive' },
        ...(exceptId ? { id: { not: exceptId } } : {}),
      },
      select: { id: true },
    });
    if (clash) throw new ConflictException(`There is already a table called ${name}.`);
  }

  async updateTable(id: string, dto: UpdateTableDto, userId: string) {
    await this.access.requireTable(userId, id, STAFF_ROLES.floor);
    const table = await this.prisma.table.findUnique({
      where: { id },
      include: { business: { select: { slug: true } }, qrCode: true },
    });
    if (!table) throw new NotFoundException('Table not found');
    const name = dto.name?.trim() || table.name;
    if (dto.name) await this.assertNameFree(table.businessId, name, id);
    const updated = await this.prisma.table.update({
      where: { id },
      data: {
        ...(dto.name ? { name } : {}),
        ...(dto.capacity != null ? { capacity: dto.capacity } : {}),
      },
      include: { qrCode: true },
    });
    if (dto.name && table.qrCode) {
      await this.prisma.qRCode.update({
        where: { id: table.qrCode.id },
        data: { targetUrl: tableQrUrl(table.business.slug, name, table.qrCode.id) },
      });
    }
    return updated;
  }

  async deleteTable(id: string, userId: string) {
    await this.access.requireTable(userId, id, STAFF_ROLES.floor);
    return this.prisma.table.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async getTableForScan(businessSlug: string, tableName: string) {
    const business = await this.prisma.business.findUnique({
      where: { slug: businessSlug },
    });
    if (!business) throw new NotFoundException('Restaurant not found');

    const table = await this.prisma.table.findFirst({
      where: {
        businessId: business.id,
        name: { equals: tableName, mode: 'insensitive' },
        isActive: true,
      },
      include: {
        orders: {
          where: {
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
            items: { include: { menuItem: true } },
          },
        },
      },
    });

    if (!table) throw new NotFoundException(`Table '${tableName}' not found`);

    const active = table.orders[0];
    return {
      business: {
        id: business.id,
        name: business.name,
        slug: business.slug,
        currencyCode: business.currencyCode,
        logoUrl: business.logoUrl,
      },
      table: { id: table.id, name: table.name, capacity: table.capacity },
      activeOrder: active
        ? {
            status: active.status,
            totalAmount: active.totalAmount,
            items: active.items,
          }
        : null,
    };
  }
}


export function tableQrUrl(slug: string, tableName: string, qrCodeId: string) {
  return `/r/${slug}/table/${encodeURIComponent(tableName)}?k=${encodeURIComponent(qrCodeId)}`;
}
