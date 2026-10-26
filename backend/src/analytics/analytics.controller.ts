import { applyDecorators, Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { getRequester, resolveCompanyScope } from '../common/company-scope';
import { parseDateRange } from '../common/date-range';
import { AnalyticsService } from './analytics.service';

const PeriodQueries = () =>
  applyDecorators(
    ApiQuery({ name: 'companyId', required: false, description: 'Somente super admin' }),
    ApiQuery({ name: 'from', required: false, description: 'Dia inicial AAAA-MM-DD (padrão: 30 dias atrás)' }),
    ApiQuery({ name: 'to', required: false, description: 'Dia final AAAA-MM-DD (padrão: hoje)' })
  );

@ApiTags('analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('overview')
  @PeriodQueries()
  overview(
    @Req() req: Request,
    @Query('companyId') companyId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string
  ) {
    const scope = resolveCompanyScope(getRequester(req), companyId);
    return this.analyticsService.overview(scope, parseDateRange(from, to));
  }

  @Get('sales')
  @PeriodQueries()
  sales(
    @Req() req: Request,
    @Query('companyId') companyId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string
  ) {
    const scope = resolveCompanyScope(getRequester(req), companyId);
    return this.analyticsService.sales(scope, parseDateRange(from, to));
  }

  @Get('data-quality')
  @ApiQuery({ name: 'companyId', required: false, description: 'Somente super admin' })
  dataQuality(@Req() req: Request, @Query('companyId') companyId?: string) {
    const scope = resolveCompanyScope(getRequester(req), companyId);
    return this.analyticsService.dataQuality(scope);
  }

  @Get('segments')
  @PeriodQueries()
  segments(
    @Req() req: Request,
    @Query('companyId') companyId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string
  ) {
    const scope = resolveCompanyScope(getRequester(req), companyId);
    return this.analyticsService.segments(scope, parseDateRange(from, to, 90));
  }
}
