import { Controller, Get, Query, Req, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AnalyticsService } from './analytics.service';
import { AnalyticsQueryDto } from './dto/analytics-query.dto';

@ApiTags('analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private analytics: AnalyticsService) {}

  @Get()
  report(@Req() req: any, @Query() query: AnalyticsQueryDto) {
    return this.analytics.report(req.user.sub, query);
  }

  @Get('summary')
  async summary(@Req() req: any, @Query() query: AnalyticsQueryDto) {
    const report = await this.analytics.report(req.user.sub, query);
    return { meta: report.meta, kpis: report.kpis };
  }

  @Get('traffic')
  async traffic(@Req() req: any, @Query() query: AnalyticsQueryDto) {
    const report = await this.analytics.report(req.user.sub, query);
    return { meta: report.meta, traffic: report.traffic };
  }

  @Get('queue-performance')
  async queuePerformance(@Req() req: any, @Query() query: AnalyticsQueryDto) {
    const report = await this.analytics.report(req.user.sub, query);
    return { meta: report.meta, queuePerformance: report.queuePerformance };
  }

  @Get('peak-hours')
  async peakHours(@Req() req: any, @Query() query: AnalyticsQueryDto) {
    const report = await this.analytics.report(req.user.sub, query);
    return { meta: report.meta, peakHours: report.peakHours };
  }

  @Get('behaviour')
  async behaviour(@Req() req: any, @Query() query: AnalyticsQueryDto) {
    const report = await this.analytics.report(req.user.sub, query);
    return { meta: report.meta, behaviour: report.behaviour };
  }

  @Get('performance')
  async performance(@Req() req: any, @Query() query: AnalyticsQueryDto) {
    const report = await this.analytics.report(req.user.sub, query);
    return { meta: report.meta, performance: report.performance };
  }

  @Get('insights')
  async insights(@Req() req: any, @Query() query: AnalyticsQueryDto) {
    const report = await this.analytics.report(req.user.sub, query);
    return { meta: report.meta, insights: report.insights };
  }

  @Get('export')
  async export(@Req() req: any, @Query() query: AnalyticsQueryDto, @Res() res: Response) {
    const filename = `qfast-analytics-${query.from || 'range'}-to-${query.to || 'today'}`;
    if (query.format === 'pdf') {
      const file = await this.analytics.pdf(req.user.sub, query);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.pdf"`);
      res.send(file);
      return;
    }
    const file = await this.analytics.csv(req.user.sub, query);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
    res.send(file);
  }
}
