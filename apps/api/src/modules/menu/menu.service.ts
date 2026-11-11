import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CreateMenuItemDto, UpdateMenuItemDto } from './dto/create-item.dto';
import { AccessService } from '../access/access.service';
import { STAFF_ROLES } from '../access/access.rules';

@Injectable()
export class MenuService {
  constructor(
    private prisma: PrismaService,
    private access: AccessService,
  ) {}

  async getPublicMenuBySlug(slug: string) {
    const business = await this.prisma.business.findUnique({
      where: { slug },
      include: {
        menus: {
          where: { isActive: true },
          take: 1,
          include: {
            categories: {
              where: { isActive: true },
              orderBy: { sortOrder: 'asc' },
              include: {
                items: {
                  where: { isAvailable: true },
                  orderBy: { sortOrder: 'asc' },
                  include: {
                    variants: true,
                    addons: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!business) throw new NotFoundException('Restaurant not found');
    return {
      businessId: business.id,
      businessName: business.name,
      currencyCode: business.currencyCode,
      menu: business.menus[0] || null,
    };
  }

  async getBusinessMenu(businessId: string, userId: string) {
    await this.access.requireStaff(userId, businessId, STAFF_ROLES.manager);
    let menu = await this.prisma.menu.findFirst({
      where: { businessId, isDefault: true },
      include: {
        categories: {
          orderBy: { sortOrder: 'asc' },
          include: {
            items: {
              orderBy: { sortOrder: 'asc' },
              include: { variants: true, addons: true },
            },
          },
        },
      },
    });

    // If none exists, create default menu
    if (!menu) {
      menu = await this.prisma.menu.create({
        data: {
          businessId,
          name: 'Main Menu',
          isDefault: true,
        },
        include: {
          categories: {
            include: {
              items: { include: { variants: true, addons: true } },
            },
          },
        },
      });
    }

    return menu;
  }

  async createCategory(businessId: string, dto: CreateCategoryDto, userId: string) {
    await this.access.requireStaff(userId, businessId, STAFF_ROLES.manager);
    const menu = await this.getBusinessMenu(businessId, userId);
    return this.prisma.menuCategory.create({
      data: {
        menuId: menu.id,
        name: dto.name,
        description: dto.description,
        sortOrder: dto.sortOrder || 0,
      },
    });
  }

  async updateCategory(id: string, dto: Partial<CreateCategoryDto>, userId: string) {
    await this.access.requireMenuCategory(userId, id, STAFF_ROLES.manager);
    return this.prisma.menuCategory.update({
      where: { id },
      data: dto,
    });
  }

  async deleteCategory(id: string, userId: string) {
    await this.access.requireMenuCategory(userId, id, STAFF_ROLES.manager);
    return this.prisma.menuCategory.delete({
      where: { id },
    });
  }

  async createItem(dto: CreateMenuItemDto, userId: string) {
    await this.access.requireMenuCategory(userId, dto.categoryId, STAFF_ROLES.manager);
    return this.prisma.menuItem.create({
      data: {
        categoryId: dto.categoryId,
        name: dto.name,
        price: dto.price,
        description: dto.description,
        servedAs: dto.servedAs,
        badge: dto.badge || null,
        imageUrl: dto.imageUrl,
        isVeg: dto.isVeg ?? true,
        prepTimeMinutes: dto.prepTimeMinutes || 15,
      },
    });
  }

  async updateItem(id: string, dto: UpdateMenuItemDto, userId: string) {
    await this.access.requireMenuItem(userId, id, STAFF_ROLES.manager);
    return this.prisma.menuItem.update({
      where: { id },
      data: {
        ...dto,
        ...(dto.badge !== undefined ? { badge: dto.badge || null } : {}),
      },
    });
  }

  async toggleItemAvailability(id: string, userId: string) {
    await this.access.requireMenuItem(userId, id, STAFF_ROLES.manager);
    const item = await this.prisma.menuItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Item not found');

    return this.prisma.menuItem.update({
      where: { id },
      data: { isAvailable: !item.isAvailable },
    });
  }

  async deleteItem(id: string, userId: string) {
    await this.access.requireMenuItem(userId, id, STAFF_ROLES.manager);
    return this.prisma.menuItem.delete({
      where: { id },
    });
  }
}

