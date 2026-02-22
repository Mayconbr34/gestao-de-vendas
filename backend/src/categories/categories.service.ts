import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateCategoryDto } from './dto/create-category.dto';
import { Category } from './category.entity';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly categoriesRepository: Repository<Category>
  ) {}

  async findAllWithCounts(companyId?: string | null) {
    const qb = this.categoriesRepository
      .createQueryBuilder('category')
      .leftJoin('category.products', 'product')
      .select('category.id', 'id')
      .addSelect('category.name', 'name')
      .addSelect('COUNT(product.id)', 'productCount')
      .groupBy('category.id')
      .addGroupBy('category.name')
      .orderBy('category.name', 'ASC');

    if (companyId) {
      qb.where('category.company_id = :companyId', { companyId });
    }

    const rows = await qb.getRawMany();

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      productCount: Number(row.productCount)
    }));
  }

  async create(dto: CreateCategoryDto, companyId: string) {
    const existing = await this.categoriesRepository.findOne({
      where: { name: dto.name, companyId }
    });
    if (existing) {
      throw new ConflictException('Categoria já existe');
    }

    const category = this.categoriesRepository.create({ name: dto.name, companyId });
    return this.categoriesRepository.save(category);
  }
}
