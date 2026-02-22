import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditsModule } from '../audits/audits.module';
import { IcmsRatesController } from './icms-rates.controller';
import { IcmsInternalRate } from './icms-internal-rate.entity';
import { IcmsRatesService } from './icms-rates.service';

@Module({
  imports: [TypeOrmModule.forFeature([IcmsInternalRate]), AuditsModule],
  controllers: [IcmsRatesController],
  providers: [IcmsRatesService],
  exports: [IcmsRatesService]
})
export class IcmsRatesModule {}
