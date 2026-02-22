import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditsController } from './audits.controller';
import { AuditsService } from './audits.service';
import { AuditLog } from './audit-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AuditLog])],
  providers: [AuditsService],
  controllers: [AuditsController],
  exports: [AuditsService]
})
export class AuditsModule {}
