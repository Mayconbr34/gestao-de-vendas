import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditsModule } from '../audits/audits.module';
import { Category } from '../categories/category.entity';
import { TaxProfile } from '../taxes/tax-profile.entity';
import { Product } from './product.entity';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

@Module({
  imports: [TypeOrmModule.forFeature([Product, Category, TaxProfile]), AuditsModule],
  providers: [ProductsService],
  controllers: [ProductsController],
  exports: [ProductsService]
})
export class ProductsModule {}
