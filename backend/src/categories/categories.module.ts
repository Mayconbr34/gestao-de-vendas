import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditsModule } from '../audits/audits.module';
import { Category } from './category.entity';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';

@Module({
  imports: [TypeOrmModule.forFeature([Category]), AuditsModule],
  providers: [CategoriesService],
  controllers: [CategoriesController],
  exports: [CategoriesService]
})
export class CategoriesModule {}
