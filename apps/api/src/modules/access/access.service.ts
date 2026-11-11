import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { roleIsAllowed } from './access.rules';

@Injectable()
export class AccessService {
  constructor(private prisma: PrismaService) {}

  async requireStaff(userId: string, businessId: string, roles?: readonly UserRole[]) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, isActive: true },
    });
    if (!user?.isActive) throw new ForbiddenException('You do not have access to this business');
    if (user.role === UserRole.SUPER_ADMIN) return { role: UserRole.SUPER_ADMIN, businessId };

    const staff = await this.prisma.staff.findFirst({
      where: { businessId, userId, isActive: true },
      select: { id: true, role: true },
    });
    if (!staff) throw new ForbiddenException('You do not have access to this business');
    if (roles && !roleIsAllowed(staff.role, roles)) {
      throw new ForbiddenException('Your role cannot do that');
    }
    return { role: staff.role, businessId };
  }

  async requireOrder(userId: string, orderId: string, roles?: readonly UserRole[]) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { businessId: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    await this.requireStaff(userId, order.businessId, roles);
    return order.businessId;
  }

  async requireMenuCategory(userId: string, categoryId: string, roles?: readonly UserRole[]) {
    const category = await this.prisma.menuCategory.findUnique({
      where: { id: categoryId },
      select: { menu: { select: { businessId: true } } },
    });
    if (!category) throw new NotFoundException('Category not found');
    await this.requireStaff(userId, category.menu.businessId, roles);
    return category.menu.businessId;
  }

  async requireMenuItem(userId: string, itemId: string, roles?: readonly UserRole[]) {
    const item = await this.prisma.menuItem.findUnique({
      where: { id: itemId },
      select: { category: { select: { menu: { select: { businessId: true } } } } },
    });
    if (!item) throw new NotFoundException('Item not found');
    await this.requireStaff(userId, item.category.menu.businessId, roles);
    return item.category.menu.businessId;
  }

  async requireTable(userId: string, tableId: string, roles?: readonly UserRole[]) {
    const table = await this.prisma.table.findUnique({
      where: { id: tableId },
      select: { businessId: true },
    });
    if (!table) throw new NotFoundException('Table not found');
    await this.requireStaff(userId, table.businessId, roles);
    return table.businessId;
  }

  async requireFeedback(userId: string, feedbackId: string, roles?: readonly UserRole[]) {
    const feedback = await this.prisma.feedback.findUnique({
      where: { id: feedbackId },
      select: { businessId: true },
    });
    if (!feedback) throw new NotFoundException('Feedback not found');
    await this.requireStaff(userId, feedback.businessId, roles);
    return feedback.businessId;
  }
}
