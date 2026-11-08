import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TablesService } from './tables.service';
import { CreateTableDto } from './dto/create-table.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('tables')
@Controller('tables')
export class TablesController {
  constructor(private tablesService: TablesService) {}

  @Get('public/:slug/:tableName')
  @ApiOperation({ summary: 'Resolve table details for customer Table QR scan' })
  async getTableForScan(
    @Param('slug') slug: string,
    @Param('tableName') tableName: string,
  ) {
    return this.tablesService.getTableForScan(slug, tableName);
  }

  @Get(':businessId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all restaurant tables with active orders' })
  async getTables(@Param('businessId') businessId: string) {
    return this.tablesService.getTables(businessId);
  }

  @Post(':businessId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create table with auto-generated QR code' })
  async createTable(
    @Param('businessId') businessId: string,
    @Body() dto: CreateTableDto,
  ) {
    return this.tablesService.createTable(businessId, dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update table details' })
  async updateTable(@Param('id') id: string, @Body() dto: Partial<CreateTableDto>) {
    return this.tablesService.updateTable(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Deactivate table' })
  async deleteTable(@Param('id') id: string) {
    return this.tablesService.deleteTable(id);
  }
}

