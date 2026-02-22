import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditsModule } from '../audits/audits.module';
import { PlatformSettingsModule } from '../platform-settings/platform-settings.module';
import { CompaniesController } from './companies.controller';
import { Company } from './company.entity';
import { CompaniesService } from './companies.service';

@Module({
  imports: [TypeOrmModule.forFeature([Company]), AuditsModule, PlatformSettingsModule],
  controllers: [CompaniesController],
  providers: [CompaniesService],
  exports: [CompaniesService]
})
export class CompaniesModule {}
