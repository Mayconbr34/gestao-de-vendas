import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlatformSetting } from './platform-setting.entity';
import { UpdatePlatformSettingDto } from './dto/update-platform-setting.dto';

@Injectable()
export class PlatformSettingsService {
  constructor(
    @InjectRepository(PlatformSetting)
    private readonly settingsRepository: Repository<PlatformSetting>
  ) {}

  async getSettings() {
    const existing = await this.settingsRepository.findOne({ where: { id: 1 } });
    if (existing) return existing;
    const created = this.settingsRepository.create({
      platformName: 'Projeto Integrador',
      platformDescription: 'Frontend Next.js para o sistema web',
      faviconUrl: null,
      contactEmail: null,
      contactPhone: null,
      paymentGateway: null,
      emailEnabled: false,
      emailSender: null
    });
    return this.settingsRepository.save(created);
  }

  async update(dto: UpdatePlatformSettingDto) {
    const current = await this.getSettings();
    if (dto.platformName !== undefined) current.platformName = dto.platformName;
    if (dto.platformDescription !== undefined)
      current.platformDescription = dto.platformDescription ?? null;
    if (dto.faviconUrl !== undefined) current.faviconUrl = dto.faviconUrl ?? null;
    if (dto.contactEmail !== undefined) current.contactEmail = dto.contactEmail ?? null;
    if (dto.contactPhone !== undefined) current.contactPhone = dto.contactPhone ?? null;
    if (dto.paymentGateway !== undefined)
      current.paymentGateway = dto.paymentGateway ?? null;
    if (dto.emailEnabled !== undefined) current.emailEnabled = dto.emailEnabled;
    if (dto.emailSender !== undefined) current.emailSender = dto.emailSender ?? null;
    return this.settingsRepository.save(current);
  }
}
