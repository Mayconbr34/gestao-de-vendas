import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { Category } from './category.entity';
import { UserRole } from '../users/user.roles';

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

  async update(
    id: string,
    dto: UpdateCategoryDto,
    requester?: { role?: UserRole; companyId?: string | null }
  ) {
    const category = await this.categoriesRepository.findOne({ where: { id } });
    if (!category) {
      throw new NotFoundException('Categoria não encontrada');
    }

    if (requester?.role !== 'SUPER_ADMIN') {
      if (!requester?.companyId || category.companyId !== requester.companyId) {
        throw new ForbiddenException('Sem permissão');
      }
    }

    if (dto.name !== undefined) {
      const trimmed = dto.name.trim();
      const companyFilter = category.companyId ? category.companyId : IsNull();
      const existing = await this.categoriesRepository.findOne({
        where: { name: trimmed, companyId: companyFilter }
      });
      if (existing && existing.id !== category.id) {
        throw new ConflictException('Categoria já existe');
      }
      category.name = trimmed;
    }

    return this.categoriesRepository.save(category);
  }
}
