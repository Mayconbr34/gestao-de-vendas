import { Module } from '@nestjs/common';
import { MigrationsService } from './migrations.service';

@Module({
  providers: [MigrationsService]
})
export class MigrationsModule {}
