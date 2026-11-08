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

@ApiTags('orders')
@Controller('orders')
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  // ── Public Customer Endpoints ──────────────────────────────────────────────

  @Post('public')
  @ApiOperation({ summary: 'Submit order from Table QR or Takeaway link' })
  async createPublicOrder(@Body() dto: CreateOrderDto) {
    return this.ordersService.createPublicOrder(dto);
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

