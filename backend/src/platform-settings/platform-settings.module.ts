import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditsModule } from '../audits/audits.module';
import { PlatformSetting } from './platform-setting.entity';
import { PlatformSettingsController } from './platform-settings.controller';
import { PlatformSettingsPublicController } from './platform-settings.public.controller';
import { PlatformSettingsService } from './platform-settings.service';

@Module({
  imports: [TypeOrmModule.forFeature([PlatformSetting]), AuditsModule],
  controllers: [PlatformSettingsController, PlatformSettingsPublicController],
  providers: [PlatformSettingsService],
  exports: [PlatformSettingsService]
})
export class PlatformSettingsModule {}
