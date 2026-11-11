import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { MenuService } from './menu.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CreateMenuItemDto, UpdateMenuItemDto } from './dto/create-item.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('menu')
@Controller('menu')
export class MenuController {
  constructor(private menuService: MenuService) {}

  @Get('public/:slug')
  @ApiOperation({ summary: 'Get active digital menu for customer QR' })
  async getPublicMenu(@Param('slug') slug: string) {
    return this.menuService.getPublicMenuBySlug(slug);
  }

  @Get(':businessId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all categories and items for restaurant dashboard' })
  async getBusinessMenu(@Param('businessId') businessId: string, @Req() req: any) {
    return this.menuService.getBusinessMenu(businessId, req.user.sub);
  }

  @Post(':businessId/categories')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create menu category' })
  async createCategory(
    @Param('businessId') businessId: string,
    @Body() dto: CreateCategoryDto,
    @Req() req: any,
  ) {
    return this.menuService.createCategory(businessId, dto, req.user.sub);
  }

  @Patch('categories/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update menu category' })
  async updateCategory(
    @Param('id') id: string,
    @Body() dto: Partial<CreateCategoryDto>,
    @Req() req: any,
  ) {
    return this.menuService.updateCategory(id, dto, req.user.sub);
  }

  @Delete('categories/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete menu category' })
  async deleteCategory(@Param('id') id: string, @Req() req: any) {
    return this.menuService.deleteCategory(id, req.user.sub);
  }

  @Post('items')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create new menu item' })
  async createItem(@Body() dto: CreateMenuItemDto, @Req() req: any) {
    return this.menuService.createItem(dto, req.user.sub);
  }

  @Patch('items/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update menu item' })
  async updateItem(@Param('id') id: string, @Body() dto: UpdateMenuItemDto, @Req() req: any) {
    return this.menuService.updateItem(id, dto, req.user.sub);
  }

  @Patch('items/:id/toggle-availability')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Quick toggle item availability (in stock / sold out)' })
  async toggleAvailability(@Param('id') id: string, @Req() req: any) {
    return this.menuService.toggleItemAvailability(id, req.user.sub);
  }

  @Delete('items/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete menu item' })
  async deleteItem(@Param('id') id: string, @Req() req: any) {
    return this.menuService.deleteItem(id, req.user.sub);
  }
}

