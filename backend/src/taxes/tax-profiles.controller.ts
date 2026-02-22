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
import { CreateTaxProfileDto } from './dto/create-tax-profile.dto';
import { UpdateTaxProfileDto } from './dto/update-tax-profile.dto';
import { TaxProfilesService } from './tax-profiles.service';

@ApiTags('tax-profiles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'COMPANY_ADMIN')
@Controller('tax-profiles')
export class TaxProfilesController {
  constructor(
    private readonly taxProfilesService: TaxProfilesService,
    private readonly auditsService: AuditsService
  ) {}

  @Get()
  list(@Req() req: Request, @Query('companyId') companyId?: string) {
    const requester = (req as any).user as { role?: UserRole; companyId?: string | null };
    if (requester?.role === 'SUPER_ADMIN') {
      return this.taxProfilesService.findAll(companyId);
    }
    return this.taxProfilesService.findAll(requester?.companyId ?? null);
  }

  @Post()
  async create(@Body() dto: CreateTaxProfileDto, @Req() req: Request) {
    const requester = (req as any).user as { role?: UserRole; companyId?: string | null };
    const companyId =
      requester?.role === 'SUPER_ADMIN' ? dto.companyId : requester?.companyId;
    if (!companyId) {
      throw new ForbiddenException('Empresa não definida');
    }
    const profile = await this.taxProfilesService.create(dto, companyId);
    await this.auditsService.logAction({
      action: 'CREATE_TAX_PROFILE',
      resource: 'tax-profiles',
      resourceId: profile.id,
      resourceName: profile.name,
      userId: (req as any).user?.userId ?? null,
      companyId,
      ip: getRequestIp(req),
      userAgent: getUserAgent(req)
    });
    return profile;
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateTaxProfileDto, @Req() req: Request) {
    const requester = (req as any).user as { role?: UserRole; companyId?: string | null };
    if (requester?.role !== 'SUPER_ADMIN') {
      const target = await this.taxProfilesService.findById(id);
      if (!target || target.companyId !== requester?.companyId) {
        throw new ForbiddenException('Sem permissão');
      }
    }
    const profile = await this.taxProfilesService.update(id, dto);
    await this.auditsService.logAction({
      action: 'UPDATE_TAX_PROFILE',
      resource: 'tax-profiles',
      resourceId: profile.id,
      resourceName: profile.name,
      userId: (req as any).user?.userId ?? null,
      companyId: profile.companyId ?? null,
      ip: getRequestIp(req),
      userAgent: getUserAgent(req)
    });
    return profile;
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: Request) {
    const requester = (req as any).user as { role?: UserRole; companyId?: string | null };
    if (requester?.role !== 'SUPER_ADMIN') {
      const target = await this.taxProfilesService.findById(id);
      if (!target || target.companyId !== requester?.companyId) {
        throw new ForbiddenException('Sem permissão');
      }
    }
    const profile = await this.taxProfilesService.remove(id);
    await this.auditsService.logAction({
      action: 'DELETE_TAX_PROFILE',
      resource: 'tax-profiles',
      resourceId: profile.id,
      resourceName: profile.name,
      userId: (req as any).user?.userId ?? null,
      companyId: profile.companyId ?? null,
      ip: getRequestIp(req),
      userAgent: getUserAgent(req)
    });
    return profile;
  }
}
