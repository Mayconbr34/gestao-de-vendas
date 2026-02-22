import { Body, Controller, Get, Put, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { AuditsService } from '../audits/audits.service';
import { getRequestIp, getUserAgent } from '../audits/audit.utils';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UpdatePlatformSettingDto } from './dto/update-platform-setting.dto';
import { PlatformSettingsService } from './platform-settings.service';

@ApiTags('platform-settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('platform-settings')
export class PlatformSettingsController {
  constructor(
    private readonly settingsService: PlatformSettingsService,
    private readonly auditsService: AuditsService
  ) {}

  @Get()
  async get() {
    return this.settingsService.getSettings();
  }

  @Put()
  @Roles('SUPER_ADMIN')
  async update(@Body() dto: UpdatePlatformSettingDto, @Req() req: Request) {
    const updated = await this.settingsService.update(dto);
    await this.auditsService.logAction({
      action: 'UPDATE_PLATFORM_SETTINGS',
      resource: 'platform-settings',
      resourceId: String(updated.id),
      resourceName: updated.platformName,
      userId: (req as any).user?.userId ?? null,
      ip: getRequestIp(req),
      userAgent: getUserAgent(req)
    });
    return updated;
  }
}
