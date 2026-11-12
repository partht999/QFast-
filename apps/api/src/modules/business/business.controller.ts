import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BusinessService } from './business.service';
import { CreateBusinessDto } from './dto/create-business.dto';
import { UpdateBusinessSettingsDto } from './dto/update-business-settings.dto';
import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';
import { UserRole } from '@prisma/client';

class CreateStaffBody {
  @IsString()
  @MinLength(3)
  username!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsIn([UserRole.MANAGER, UserRole.CASHIER, UserRole.KITCHEN_STAFF, UserRole.WAITER])
  role!: UserRole;
}

class UploadPhotoBody {
  @IsString()
  @MaxLength(700000)
  image!: string;
}

class IntegrationBody {
  @IsIn(['SWIGGY', 'ZOMATO'])
  provider!: 'SWIGGY' | 'ZOMATO';

  @IsString()
  @MinLength(8)
  webhookSecret!: string;
}

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

  @Get('plans')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Plans a restaurant can be on' })
  async plans() {
    return this.businessService.listPlans();
  }

  @Get('places')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Search Google Maps listings for the review link' })
  async places(@Query('q') query: string) {
    return this.businessService.searchPlaces(query || '');
  }

  @Get('explore')
  @ApiOperation({ summary: 'Public endpoint to discover businesses with live queue status' })
  async explore(
    @Req() req: any,
  ) {
    const { category, search, location } = req.query;
    return this.businessService.explore(category, search, location);
  }

  @Post(':id/media')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Store a restaurant or dish photo' })
  async uploadPhoto(@Param('id') id: string, @Body() body: UploadPhotoBody, @Req() req: any) {
    const saved = await this.businessService.storePhoto(id, req.user.sub, body.image);
    return { id: saved.id, url: `${publicOrigin(req)}/api/v1/media/${saved.id}` };
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
    async findOne(@Param('id') id: string, @Req() req: any) {
    return this.businessService.findById(id, req.user.sub);
  }

  @Get(':id/staff')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async listStaff(@Param('id') id: string, @Req() req: any) {
    return this.businessService.listStaff(id, req.user.sub);
  }

  @Post(':id/staff')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async createStaff(@Param('id') id: string, @Body() body: CreateStaffBody, @Req() req: any) {
    return this.businessService.createStaff(id, req.user.sub, body);
  }

  @Post(':id/integrations')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async saveIntegration(@Param('id') id: string, @Body() body: IntegrationBody, @Req() req: any) {
    return this.businessService.saveIntegration(id, req.user.sub, body.provider, body.webhookSecret);
  }

  @Get('public/:slug')
  @ApiOperation({ summary: 'Public endpoint to load restaurant details for customer QR scan' })
  async getPublicBySlug(@Param('slug') slug: string) {
    return this.businessService.findBySlug(slug);
  }
}

function publicOrigin(req: { protocol?: string; get?: (name: string) => string | undefined; headers: Record<string, string | string[] | undefined> }) {
  const configured = process.env.PUBLIC_API_URL || process.env.RENDER_EXTERNAL_URL;
  if (configured) return configured.replace(/\/$/, '');
  const forwarded = req.headers['x-forwarded-proto'];
  const proto = String(Array.isArray(forwarded) ? forwarded[0] : forwarded || req.protocol || 'http').split(',')[0];
  return `${proto}://${req.get?.('host') || 'localhost:3001'}`;
}
