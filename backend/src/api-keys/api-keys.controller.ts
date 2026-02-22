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
import { ApiKeysService } from './api-keys.service';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { UpdateApiKeyDto } from './dto/update-api-key.dto';
import { UserRole } from '../users/user.roles';

@ApiTags('api-keys')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'COMPANY_ADMIN')
@Controller('api-keys')
export class ApiKeysController {
  constructor(
    private readonly apiKeysService: ApiKeysService,
    private readonly auditsService: AuditsService
  ) {}

  @Get()
  list(@Req() req: Request, @Query('companyId') companyId?: string) {
    const requester = (req as any).user as { role?: UserRole; companyId?: string | null };
    if (requester?.role === 'SUPER_ADMIN') {
      return this.apiKeysService.list(companyId);
    }
    return this.apiKeysService.list(requester?.companyId ?? null);
  }

  @Get(':id/requests')
  async listRequests(@Param('id') id: string, @Query('limit') limit: string | undefined, @Req() req: Request) {
    const requester = (req as any).user as { role?: UserRole; companyId?: string | null };
    if (requester?.role !== 'SUPER_ADMIN') {
      const key = await this.apiKeysService.findById(id);
      if (!key || key.companyId !== requester?.companyId) {
        return [];
      }
    }
    const parsed = limit ? Number(limit) : 50;
    return this.apiKeysService.listRequests(id, Number.isNaN(parsed) ? 50 : parsed);
  }

  @Post()
  async create(@Body() dto: CreateApiKeyDto, @Req() req: Request) {
    const requester = (req as any).user as { role?: UserRole; companyId?: string | null };
    const companyId =
      requester?.role === 'SUPER_ADMIN' ? dto.companyId : requester?.companyId;
    if (!companyId) {
      throw new ForbiddenException('Empresa não definida');
    }
    const created = await this.apiKeysService.create(dto, companyId);
    await this.auditsService.logAction({
      action: 'CREATE_API_KEY',
      resource: 'api-keys',
      resourceId: created.id,
      resourceName: created.name,
      userId: (req as any).user?.userId ?? null,
      companyId: companyId ?? null,
      ip: getRequestIp(req),
      userAgent: getUserAgent(req)
    });
    return created;
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateApiKeyDto,
    @Req() req: Request
  ) {
    const requester = (req as any).user as { role?: UserRole; companyId?: string | null };
    const updated = await this.apiKeysService.update(id, dto, requester);
    await this.auditsService.logAction({
      action: 'UPDATE_API_KEY',
      resource: 'api-keys',
      resourceId: updated.id,
      resourceName: updated.name,
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
    const removed = await this.apiKeysService.remove(id, requester);
    await this.auditsService.logAction({
      action: 'DELETE_API_KEY',
      resource: 'api-keys',
      resourceId: removed.id,
      resourceName: removed.name,
      userId: (req as any).user?.userId ?? null,
      companyId: removed.companyId ?? null,
      ip: getRequestIp(req),
      userAgent: getUserAgent(req)
    });
    return removed;
  }
}
