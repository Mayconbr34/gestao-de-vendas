import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditsModule } from '../audits/audits.module';
import { TaxProfile } from './tax-profile.entity';
import { TaxProfilesController } from './tax-profiles.controller';
import { TaxProfilesService } from './tax-profiles.service';

@Module({
  imports: [TypeOrmModule.forFeature([TaxProfile]), AuditsModule],
  providers: [TaxProfilesService],
  controllers: [TaxProfilesController],
  exports: [TaxProfilesService]
})
export class TaxProfilesModule {}
