import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditsModule } from '../audits/audits.module';
import { FiscalRulesController } from './fiscal-rules.controller';
import { FiscalRule } from './fiscal-rule.entity';
import { FiscalRulesService } from './fiscal-rules.service';
import { IcmsRatesModule } from './icms-rates.module';

@Module({
  imports: [TypeOrmModule.forFeature([FiscalRule]), AuditsModule, IcmsRatesModule],
  controllers: [FiscalRulesController],
  providers: [FiscalRulesService]
})
export class FiscalRulesModule {}
