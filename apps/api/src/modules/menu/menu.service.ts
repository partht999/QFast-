import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/create-category.dto';
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
                  where: { isAvailable: true, archivedAt: null },
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
          where: { archivedAt: null },
          orderBy: { sortOrder: 'asc' },
          include: {
            items: {
              where: { archivedAt: null },
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

  async updateCategory(id: string, dto: UpdateCategoryDto, userId: string) {
    await this.access.requireMenuCategory(userId, id, STAFF_ROLES.manager);
    return this.prisma.menuCategory.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
      },
    });
  }

  async deleteCategory(id: string, userId: string) {
    await this.access.requireMenuCategory(userId, id, STAFF_ROLES.manager);
    const items = await this.prisma.menuItem.findMany({ where: { categoryId: id }, select: { id: true } });
    for (const item of items) await this.removeItem(item.id);
    const left = await this.prisma.menuItem.count({ where: { categoryId: id } });
    if (left) {
      // Dishes that are on past bills must stay for history, so the category is hidden instead.
      return this.prisma.menuCategory.update({ where: { id }, data: { isActive: false, archivedAt: new Date() } });
    }
    return this.prisma.menuCategory.delete({ where: { id } });
  }

  /** Deletes a dish, or hides it when past orders or reviews still point at it. */
  private async removeItem(id: string) {
    const [orders, ratings] = await Promise.all([
      this.prisma.orderItem.count({ where: { menuItemId: id } }),
      this.prisma.feedbackItemRating.count({ where: { menuItemId: id } }),
    ]);
    if (orders || ratings) {
      return this.prisma.menuItem.update({ where: { id }, data: { isAvailable: false, archivedAt: new Date() } });
    }
    return this.prisma.menuItem.delete({ where: { id } });
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
    if (item.archivedAt) throw new NotFoundException('Item not found');

    return this.prisma.menuItem.update({
      where: { id },
      data: { isAvailable: !item.isAvailable },
    });
  }

  async deleteItem(id: string, userId: string) {
    await this.access.requireMenuItem(userId, id, STAFF_ROLES.manager);
    return this.removeItem(id);
  }
}

