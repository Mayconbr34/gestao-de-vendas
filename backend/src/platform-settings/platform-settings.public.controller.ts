import { Controller, Get } from '@nestjs/common';
import { PlatformSettingsService } from './platform-settings.service';

@Controller('platform-settings')
export class PlatformSettingsPublicController {
  constructor(private readonly settingsService: PlatformSettingsService) {}

  @Get('public')
  async getPublic() {
    const settings = await this.settingsService.getSettings();
    return {
      platformName: settings.platformName,
      platformDescription: settings.platformDescription ?? null,
      contactEmail: settings.contactEmail ?? null,
      contactPhone: settings.contactPhone ?? null,
      paymentGateway: settings.paymentGateway ?? null,
      emailEnabled: settings.emailEnabled,
      emailSender: settings.emailSender ?? null
    };
  }
}
