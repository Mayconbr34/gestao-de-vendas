import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { parseDateRange } from '../common/date-range';
import { AuditsService } from './audits.service';
import { UserRole } from '../users/user.roles';

@ApiTags('audits')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('audits')
export class AuditsController {
  constructor(private readonly auditsService: AuditsService) {}

  @Get()
  @ApiQuery({ name: 'companyId', required: false, description: 'Somente super admin' })
  @ApiQuery({ name: 'from', required: false, description: 'Dia inicial AAAA-MM-DD' })
  @ApiQuery({ name: 'to', required: false, description: 'Dia final AAAA-MM-DD' })
  @ApiQuery({ name: 'action', required: false, description: 'Ex.: LOGIN, CREATE_PRODUCT, CREATE_SALE' })
  @ApiQuery({ name: 'resource', required: false, description: 'Ex.: products, sales, users' })
  list(
    @Req() req: Request,
    @Query('companyId') companyId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('action') action?: string,
    @Query('resource') resource?: string
  ) {
    const requester = (req as any).user as { role?: UserRole; companyId?: string | null; userId?: string };
    const range = from || to ? parseDateRange(from, to, 30, 3660) : null;
    const filters = {
      from: range?.from ?? null,
      to: range?.to ?? null,
      action: action || null,
      resource: resource || null
    };

    if (requester?.role === 'SUPER_ADMIN') {
      return this.auditsService.list({ ...filters, companyId: companyId || null });
    }
    if (requester?.role === 'COMPANY_USER') {
      return this.auditsService.list({ ...filters, userId: requester.userId });
    }
    if (!requester?.companyId) {
      // Administrador sem empresa vinculada não deve enxergar a auditoria de outras empresas.
      return [];
    }
    return this.auditsService.list({ ...filters, companyId: requester.companyId });
  }
}
