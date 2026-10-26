import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards
} from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { AuditsService } from '../audits/audits.service';
import { getRequestIp, getUserAgent } from '../audits/audit.utils';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { getRequester, resolveCompanyScope } from '../common/company-scope';
import { parseDateRange } from '../common/date-range';
import { CreateSaleDto } from './dto/create-sale.dto';
import { SalesService } from './sales.service';
import { SALE_STATUSES } from './sales.types';

@ApiTags('sales')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('sales')
export class SalesController {
  constructor(
    private readonly salesService: SalesService,
    private readonly auditsService: AuditsService
  ) {}

  @Get()
  @ApiQuery({ name: 'companyId', required: false })
  @ApiQuery({ name: 'from', required: false, description: 'AAAA-MM-DD' })
  @ApiQuery({ name: 'to', required: false, description: 'AAAA-MM-DD' })
  @ApiQuery({ name: 'status', required: false, enum: SALE_STATUSES })
  @ApiQuery({ name: 'limit', required: false })
  list(
    @Req() req: Request,
    @Query('companyId') companyId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('status') status?: string,
    @Query('limit') limit?: string
  ) {
    const requester = getRequester(req);
    const scope = resolveCompanyScope(requester, companyId);
    if (status && !(SALE_STATUSES as readonly string[]).includes(status)) {
      throw new BadRequestException('Status inválido');
    }
    const range = from || to ? parseDateRange(from, to) : null;
    return this.salesService.list({
      companyId: scope,
      from: range?.from ?? null,
      to: range?.to ?? null,
      status: status ?? null,
      limit: limit ? Number(limit) || 50 : 50
    });
  }

  /** Indica se o PDV está habilitado para a empresa do usuário (ou a informada, para super admin). */
  @Get('availability')
  @ApiQuery({ name: 'companyId', required: false })
  availability(@Req() req: Request, @Query('companyId') companyId?: string) {
    const requester = getRequester(req);
    const scope = resolveCompanyScope(requester, companyId);
    if (!scope) {
      return { enabled: false, companyId: null, companyName: null, reason: 'Selecione uma empresa' };
    }
    return this.salesService.availability(scope);
  }

  @Get(':id')
  getById(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    return this.salesService.findById(id, getRequester(req));
  }

  @Post()
  async create(@Body() dto: CreateSaleDto, @Req() req: Request) {
    const requester = getRequester(req);
    const companyId =
      requester.role === 'SUPER_ADMIN' ? dto.companyId ?? requester.companyId : requester.companyId;
    if (!companyId) {
      throw new ForbiddenException('Informe a empresa da venda');
    }

    const sale = await this.salesService.create(dto, companyId, requester.userId ?? null);
    await this.auditsService.logAction({
      action: 'CREATE_SALE',
      resource: 'sales',
      resourceId: sale.id,
      resourceName: `Venda R$ ${sale.total.toFixed(2)} (${sale.itemsCount} itens)`,
      userId: requester.userId ?? null,
      companyId,
      ip: getRequestIp(req),
      userAgent: getUserAgent(req)
    });
    return sale;
  }

  @Post(':id/cancel')
  async cancel(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    const requester = getRequester(req);
    if (requester.role === 'COMPANY_USER') {
      throw new ForbiddenException('Somente administradores podem cancelar vendas');
    }
    const sale = await this.salesService.cancel(id, requester);
    await this.auditsService.logAction({
      action: 'CANCEL_SALE',
      resource: 'sales',
      resourceId: sale.id,
      resourceName: `Venda R$ ${sale.total.toFixed(2)} cancelada`,
      userId: requester.userId ?? null,
      companyId: sale.companyId,
      ip: getRequestIp(req),
      userAgent: getUserAgent(req)
    });
    return sale;
  }
}
