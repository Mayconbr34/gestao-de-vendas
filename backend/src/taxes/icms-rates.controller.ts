import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { AuditsService } from '../audits/audits.service';
import { getRequestIp, getUserAgent } from '../audits/audit.utils';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UserRole } from '../users/user.roles';
import { CreateIcmsRateDto } from './dto/create-icms-rate.dto';
import { UpdateIcmsRateDto } from './dto/update-icms-rate.dto';
import { IcmsRatesService } from './icms-rates.service';

@ApiTags('icms-rates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'COMPANY_ADMIN')
@Controller('icms-rates')
export class IcmsRatesController {
  constructor(
    private readonly icmsRatesService: IcmsRatesService,
    private readonly auditsService: AuditsService
  ) {}

  @Get()
  list(@Req() req: Request, @Query('companyId') companyId?: string) {
    const requester = (req as any).user as { role?: UserRole; companyId?: string | null };
    if (requester?.role === 'SUPER_ADMIN') {
      return this.icmsRatesService.list(companyId);
    }
    return this.icmsRatesService.list(requester?.companyId ?? null);
  }

  @Post()
  async create(@Body() dto: CreateIcmsRateDto, @Req() req: Request) {
    const requester = (req as any).user as { role?: UserRole; companyId?: string | null };
    const companyId =
      requester?.role === 'SUPER_ADMIN' ? dto.companyId : requester?.companyId;
    if (!companyId) {
      throw new ForbiddenException('Empresa não definida');
    }
    const created = await this.icmsRatesService.create(dto, companyId);
    await this.auditsService.logAction({
      action: 'CREATE_ICMS_RATE',
      resource: 'icms-rates',
      resourceId: created.id,
      resourceName: `${created.uf} ${created.rate}%`,
      userId: (req as any).user?.userId ?? null,
      companyId,
      ip: getRequestIp(req),
      userAgent: getUserAgent(req)
    });
    return created;
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateIcmsRateDto,
    @Req() req: Request
  ) {
    const requester = (req as any).user as { role?: UserRole; companyId?: string | null };
    const updated = await this.icmsRatesService.update(id, dto, requester);
    await this.auditsService.logAction({
      action: 'UPDATE_ICMS_RATE',
      resource: 'icms-rates',
      resourceId: updated.id,
      resourceName: `${updated.uf} ${updated.rate}%`,
      userId: (req as any).user?.userId ?? null,
      companyId: updated.companyId ?? null,
      ip: getRequestIp(req),
      userAgent: getUserAgent(req)
    });
    return updated;
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: Request) {
    const requester = (req as any).user as { role?: UserRole; companyId?: string | null };
    const removed = await this.icmsRatesService.remove(id, requester);
    await this.auditsService.logAction({
      action: 'DELETE_ICMS_RATE',
      resource: 'icms-rates',
      resourceId: removed.id,
      resourceName: `${removed.uf} ${removed.rate}%`,
      userId: (req as any).user?.userId ?? null,
      companyId: removed.companyId ?? null,
      ip: getRequestIp(req),
      userAgent: getUserAgent(req)
    });
    return removed;
  }
}
