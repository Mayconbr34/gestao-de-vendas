import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { ApiKeyGuard } from './guards/api-key.guard';
import { ProductsService } from '../products/products.service';
import { CategoriesService } from '../categories/categories.service';

@ApiTags('public-api')
@UseGuards(ApiKeyGuard)
@Controller('api')
export class ApiPublicController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly categoriesService: CategoriesService
  ) {}

  @Get('products')
  listProducts(@Req() req: Request) {
    const companyId = (req as any).apiKey?.companyId ?? null;
    return this.productsService.findAll(companyId);
  }

  @Get('categories')
  listCategories(@Req() req: Request) {
    const companyId = (req as any).apiKey?.companyId ?? null;
    return this.categoriesService.findAllWithCounts(companyId);
  }
}
