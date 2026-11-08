import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CreateMenuItemDto, UpdateMenuItemDto } from './dto/create-item.dto';

@Injectable()
export class MenuService {
  constructor(private prisma: PrismaService) {}

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

  async getBusinessMenu(businessId: string) {
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

  async createCategory(businessId: string, dto: CreateCategoryDto) {
    const menu = await this.getBusinessMenu(businessId);
    return this.prisma.menuCategory.create({
      data: {
        menuId: menu.id,
        name: dto.name,
        description: dto.description,
        sortOrder: dto.sortOrder || 0,
      },
    });
  }

  async updateCategory(id: string, dto: Partial<CreateCategoryDto>) {
    return this.prisma.menuCategory.update({
      where: { id },
      data: dto,
    });
  }

  async deleteCategory(id: string) {
    return this.prisma.menuCategory.delete({
      where: { id },
    });
  }

  async createItem(dto: CreateMenuItemDto) {
    return this.prisma.menuItem.create({
      data: {
        categoryId: dto.categoryId,
        name: dto.name,
        price: dto.price,
        description: dto.description,
        imageUrl: dto.imageUrl,
        isVeg: dto.isVeg ?? true,
        prepTimeMinutes: dto.prepTimeMinutes || 15,
      },
    });
  }

  async updateItem(id: string, dto: UpdateMenuItemDto) {
    return this.prisma.menuItem.update({
      where: { id },
      data: dto,
    });
  }

  async toggleItemAvailability(id: string) {
    const item = await this.prisma.menuItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Item not found');

    return this.prisma.menuItem.update({
      where: { id },
      data: { isAvailable: !item.isAvailable },
    });
  }

  async deleteItem(id: string) {
    return this.prisma.menuItem.delete({
      where: { id },
    });
  }
}

