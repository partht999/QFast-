import { Module } from '@nestjs/common';
import { BusinessController } from './business.controller';
import { MediaController } from './media.controller';
import { BusinessService } from './business.service';

@Module({
  controllers: [BusinessController, MediaController],
  providers: [BusinessService],
  exports: [BusinessService],
})
export class BusinessModule {}
