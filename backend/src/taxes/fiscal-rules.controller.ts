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
import { CreateFiscalRuleDto } from './dto/create-fiscal-rule.dto';
import { ResolveFiscalRuleDto } from './dto/resolve-fiscal-rule.dto';
import { UpdateFiscalRuleDto } from './dto/update-fiscal-rule.dto';
import { FiscalRulesService } from './fiscal-rules.service';

@ApiTags('fiscal-rules')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('fiscal-rules')
export class FiscalRulesController {
  constructor(
    private readonly fiscalRulesService: FiscalRulesService,
    private readonly auditsService: AuditsService
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'COMPANY_ADMIN')
  list(@Req() req: Request, @Query('companyId') companyId?: string) {
    const requester = (req as any).user as { role?: UserRole; companyId?: string | null };
    if (requester?.role === 'SUPER_ADMIN') {
      return this.fiscalRulesService.list(companyId);
    }
    return this.fiscalRulesService.list(requester?.companyId ?? null);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'COMPANY_ADMIN')
  async create(@Body() dto: CreateFiscalRuleDto, @Req() req: Request) {
    const requester = (req as any).user as { role?: UserRole; companyId?: string | null };
    const companyId =
      requester?.role === 'SUPER_ADMIN' ? dto.companyId : requester?.companyId;
    if (!companyId) {
      throw new ForbiddenException('Empresa não definida');
    }
    const created = await this.fiscalRulesService.create(dto, companyId);
    await this.auditsService.logAction({
      action: 'CREATE_FISCAL_RULE',
      resource: 'fiscal-rules',
      resourceId: created.id,
      resourceName: created.description ?? created.mode,
      userId: (req as any).user?.userId ?? null,
      companyId,
      ip: getRequestIp(req),
      userAgent: getUserAgent(req)
    });
    return created;
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'COMPANY_ADMIN')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateFiscalRuleDto,
    @Req() req: Request
  ) {
    const requester = (req as any).user as { role?: UserRole; companyId?: string | null };
    const updated = await this.fiscalRulesService.update(id, dto, requester);
    await this.auditsService.logAction({
      action: 'UPDATE_FISCAL_RULE',
      resource: 'fiscal-rules',
      resourceId: updated.id,
      resourceName: updated.description ?? updated.mode,
      userId: (req as any).user?.userId ?? null,
      companyId: updated.companyId ?? null,
      ip: getRequestIp(req),
      userAgent: getUserAgent(req)
    });
    return updated;
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'COMPANY_ADMIN')
  async remove(@Param('id') id: string, @Req() req: Request) {
    const requester = (req as any).user as { role?: UserRole; companyId?: string | null };
    const removed = await this.fiscalRulesService.remove(id, requester);
    await this.auditsService.logAction({
      action: 'DELETE_FISCAL_RULE',
      resource: 'fiscal-rules',
      resourceId: removed.id,
      resourceName: removed.description ?? removed.mode,
      userId: (req as any).user?.userId ?? null,
      companyId: removed.companyId ?? null,
      ip: getRequestIp(req),
      userAgent: getUserAgent(req)
    });
    return removed;
  }

  @Post('resolve')
  async resolve(@Body() dto: ResolveFiscalRuleDto, @Req() req: Request) {
    const requester = (req as any).user as { role?: UserRole; companyId?: string | null };
    const companyId =
      requester?.role === 'SUPER_ADMIN' ? dto.companyId : requester?.companyId;
    if (!companyId) {
      throw new ForbiddenException('Empresa não definida');
    }
    const resolved = await this.fiscalRulesService.resolve(dto, companyId);
    await this.auditsService.logAction({
      action: 'RESOLVE_FISCAL_RULE',
      resource: 'fiscal-rules',
      resourceId: (resolved as any).ruleId ?? null,
      resourceName: (resolved as any).ruleDescription ?? null,
      userId: (req as any).user?.userId ?? null,
      companyId,
      ip: getRequestIp(req),
      userAgent: getUserAgent(req)
    });
    return resolved;
  }
}
