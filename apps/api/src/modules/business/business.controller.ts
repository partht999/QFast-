import { Controller, Get, Post, Patch, Body, Param, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BusinessService } from './business.service';
import { CreateBusinessDto } from './dto/create-business.dto';
import { UpdateBusinessSettingsDto } from './dto/update-business-settings.dto';

@ApiTags('business')
@Controller('business')
export class BusinessController {
  constructor(private businessService: BusinessService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a business on the Advanced plan' })
  async create(@Body() dto: CreateBusinessDto, @Req() req: any) {
    return this.businessService.create(req.user.sub, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all businesses belonging to current user' })
  async list(@Req() req: any) {
    return this.businessService.findByOwner(req.user.sub);
  }

  @Get('explore')
  @ApiOperation({ summary: 'Public endpoint to discover businesses with live queue status' })
  async explore(
    @Req() req: any,
  ) {
    const { category, search, location } = req.query;
    return this.businessService.explore(category, search, location);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update workspace, queue, and Google review settings' })
  async updateSettings(@Param('id') id: string, @Body() dto: UpdateBusinessSettingsDto, @Req() req: any) {
    return this.businessService.updateSettings(id, req.user.sub, dto);
  }

  @Get(':id/today')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Today’s queue and order report' })
  async today(@Param('id') id: string, @Req() req: any) {
    return this.businessService.getTodayReport(id, req.user.sub);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get business details by ID' })
  async findOne(@Param('id') id: string) {
    return this.businessService.findById(id);
  }

  @Get('public/:slug')
  @ApiOperation({ summary: 'Public endpoint to load restaurant details for customer QR scan' })
  async getPublicBySlug(@Param('slug') slug: string) {
    return this.businessService.findBySlug(slug);
  }
}
