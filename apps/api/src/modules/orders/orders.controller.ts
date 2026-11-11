import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrderStatus } from '@prisma/client';
import { BadRequestException } from '@nestjs/common';

@ApiTags('orders')
@Controller('orders')
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  // ── Public Customer Endpoints ──────────────────────────────────────────────

  @Post('public/partner/:slug')
  @ApiOperation({ summary: 'Accept a Swiggy or Zomato order into the kitchen' })
  async partnerOrder(
    @Param('slug') slug: string,
    @Body()
    body: {
      provider?: 'SWIGGY' | 'ZOMATO';
      secret?: string;
      externalId?: string;
      customerName?: string;
      items?: Array<{ name: string; quantity: number; price: number }>;
    },
  ) {
    return this.ordersService.ingestPartnerOrder(slug, {
      provider: body.provider === 'ZOMATO' ? 'ZOMATO' : 'SWIGGY',
      secret: body.secret || '',
      externalId: body.externalId || '',
      customerName: body.customerName,
      items: body.items || [],
    });
  }

  @Post('public')
  @ApiOperation({ summary: 'Submit order from Table QR or Takeaway link' })
  async createPublicOrder(@Body() dto: CreateOrderDto) {
    return this.ordersService.createPublicOrder(dto);
  }

  @Post('public/:orderId/pay')
  @ApiOperation({ summary: 'Guest pays the current bill at the table or counter' })
  async customerPay(
    @Param('orderId') orderId: string,
    @Body('method') method: string,
  ) {
    if (method !== 'CASH' && method !== 'CARD_AT_COUNTER' && method !== 'UPI_AT_COUNTER') {
      throw new BadRequestException('Choose UPI, cash, or card.');
    }
    return this.ordersService.customerPay(orderId, method);
  }

  @Post('public/:orderId/close')
  @ApiOperation({ summary: 'Guest closes a table or takeaway bill after it is paid' })
  async customerClose(@Param('orderId') orderId: string) {
    return this.ordersService.customerCloseOrder(orderId);
  }

  @Post('public/:orderId/help')
  @ApiOperation({ summary: 'Ask staff for a waiter or the bill' })
  async requestHelp(@Param('orderId') orderId: string, @Body('kind') kind: 'waiter' | 'bill') {
    return this.ordersService.requestStaffHelp(orderId, kind === 'bill' ? 'bill' : 'waiter');
  }

  @Patch(':id/pay')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark one order paid after the kitchen is finished' })
  async markPaid(@Param('id') id: string) {
    return this.ordersService.markOrderPaid(id);
  }

  @Get('public/:orderId')
  @ApiOperation({ summary: 'Customer live tracking for their active order' })
  async getPublicOrder(@Param('orderId') orderId: string) {
    return this.ordersService.getPublicOrder(orderId);
  }

  // ── Staff & Kitchen KDS Endpoints ──────────────────────────────────────────

  @Get('active/:businessId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get active orders for Kitchen Display System (KDS)' })
  async getActiveOrders(@Param('businessId') businessId: string) {
    return this.ordersService.getActiveOrders(businessId);
  }

  @Get('recent-completed/:businessId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get recently completed orders for KDS ticket recall' })
  async getRecentCompletedOrders(@Param('businessId') businessId: string) {
    return this.ordersService.getRecentCompletedOrders(businessId);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update order preparation status (Kitchen / Staff)' })
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: OrderStatus,
  ) {
    return this.ordersService.updateOrderStatus(id, status);
  }

  @Get('overview/:businessId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get overview metrics & today sales for restaurant dashboard' })
  async getOverview(@Param('businessId') businessId: string) {
    return this.ordersService.getOverviewStats(businessId);
  }
}

