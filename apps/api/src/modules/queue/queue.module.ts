import { Module } from '@nestjs/common';
import { QueueController } from './queue.controller';
import { QueueService } from './queue.service';
import { LoyaltyModule } from '../loyalty/loyalty.module';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [LoyaltyModule, OrdersModule],
  controllers: [QueueController],
  providers: [QueueService],
  exports: [QueueService],
})
export class QueueModule {}

