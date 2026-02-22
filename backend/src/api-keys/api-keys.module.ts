import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditsModule } from '../audits/audits.module';
import { CategoriesModule } from '../categories/categories.module';
import { ProductsModule } from '../products/products.module';
import { ApiRequestLog } from './api-request-log.entity';
import { ApiKey } from './api-key.entity';
import { ApiKeysController } from './api-keys.controller';
import { ApiKeysService } from './api-keys.service';
import { ApiPublicController } from './api-public.controller';
import { ApiKeyGuard } from './guards/api-key.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([ApiKey, ApiRequestLog]),
    AuditsModule,
    ProductsModule,
    CategoriesModule
  ],
  providers: [ApiKeysService, ApiKeyGuard],
  controllers: [ApiKeysController, ApiPublicController],
  exports: [ApiKeysService]
})
export class ApiKeysModule {}
