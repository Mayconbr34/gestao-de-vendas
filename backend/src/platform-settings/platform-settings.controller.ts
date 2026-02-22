import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Put,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { AuditsService } from '../audits/audits.service';
import { getRequestIp, getUserAgent } from '../audits/audit.utils';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { createImageStorage, imageFileFilter } from '../common/upload';
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

  @Post('favicon')
  @Roles('SUPER_ADMIN')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: createImageStorage('platform'),
      fileFilter: imageFileFilter,
      limits: { fileSize: 1024 * 1024 }
    })
  )
  async uploadFavicon(@UploadedFile() file: any, @Req() req: Request) {
    if (!file) {
      throw new BadRequestException('Imagem inválida');
    }
    const faviconUrl = `/uploads/platform/${file.filename}`;
    const updated = await this.settingsService.update({ faviconUrl });
    await this.auditsService.logAction({
      action: 'UPDATE_PLATFORM_FAVICON',
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
