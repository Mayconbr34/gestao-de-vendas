import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Company } from '../companies/company.entity';
import { Category } from '../categories/category.entity';
import { TaxProfile } from '../taxes/tax-profile.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product } from './product.entity';
import { UserRole } from '../users/user.roles';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
    @InjectRepository(Category)
    private readonly categoriesRepository: Repository<Category>,
    @InjectRepository(TaxProfile)
    private readonly taxProfilesRepository: Repository<TaxProfile>
  ) {}

  async findAll(companyId?: string | null) {
    const qb = this.productsRepository
      .createQueryBuilder('product')
      .leftJoin('product.category', 'category')
      .select([
        'product.id AS id',
        'product.name AS name',
        'product.sku AS sku',
        'product.ncm AS ncm',
        'product.cest AS cest',
        'product.origin AS origin',
        'product.stock AS stock',
        'product.price AS price',
        'product.barcode AS barcode',
        'product.image_url AS image_url',
        'product.tax_type AS tax_type',
        'product.tax_ncm AS tax_ncm',
        'product.tax_cest AS tax_cest',
        'product.company_id AS company_id',
        'category.name AS category_name'
      ])
      .orderBy('product.name', 'ASC');

    if (companyId) {
      qb.where('product.company_id = :companyId', { companyId });
    }

    const rows = await qb.getRawMany();
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      sku: row.sku ?? null,
      ncm: row.ncm ?? null,
      cest: row.cest ?? null,
      origin: row.origin !== null && row.origin !== undefined ? Number(row.origin) : null,
      stock: Number(row.stock),
      price: Number(row.price),
      barcode: row.barcode,
      imageUrl: row.image_url ?? null,
      taxType: row.tax_type ?? null,
      taxNcm: row.tax_ncm ?? null,
      taxCest: row.tax_cest ?? null,
      companyId: row.company_id ?? null,
      categoryName: row.category_name ?? null
    }));
  }

  async findById(
    id: string,
    requester?: { role?: UserRole; companyId?: string | null }
  ) {
    const product = await this.productsRepository.findOne({
      where: { id },
      relations: ['category']
    });
    if (!product) {
      throw new NotFoundException('Produto não encontrado');
    }
    if (requester?.role !== 'SUPER_ADMIN') {
      if (!requester?.companyId || product.companyId !== requester.companyId) {
        throw new ForbiddenException('Sem permissão');
      }
    }
    return {
      id: product.id,
      name: product.name,
      sku: product.sku ?? null,
      ncm: product.ncm ?? null,
      cest: product.cest ?? null,
      origin: product.origin !== null && product.origin !== undefined ? Number(product.origin) : null,
      stock: Number(product.stock),
      price: Number(product.price),
      barcode: product.barcode ?? null,
      imageUrl: product.imageUrl ?? null,
      taxType: product.taxType ?? null,
      taxNcm: product.taxNcm ?? null,
      taxCest: product.taxCest ?? null,
      companyId: product.companyId ?? null,
      categoryId: product.category?.id ?? null,
      categoryName: product.category?.name ?? null
    };
  }

  async create(dto: CreateProductDto, companyId: string) {
    const category = await this.categoriesRepository.findOne({
      where: { id: dto.categoryId, companyId }
    });

    if (!category) {
      throw new NotFoundException('Categoria não encontrada');
    }

    let taxProfile: TaxProfile | null = null;
    if (dto.taxProfileId) {
      taxProfile = await this.taxProfilesRepository.findOne({
        where: { id: dto.taxProfileId, companyId }
      });
      if (!taxProfile) {
        throw new NotFoundException('Configuração tributária não encontrada');
      }
    }

    const product = this.productsRepository.create({
      name: dto.name,
      sku: dto.sku,
      ncm: dto.ncm,
      cest: dto.cest ?? null,
      origin: dto.origin,
      stock: dto.stock,
      price: dto.price,
      barcode: dto.barcode ?? null,
      imageUrl: null,
      taxProfileId: taxProfile?.id ?? null,
      taxType: taxProfile?.taxType ?? dto.taxType ?? null,
      taxNcm: taxProfile?.ncm ?? dto.taxNcm ?? null,
      taxCest: taxProfile?.cest ?? dto.taxCest ?? null,
      category,
      companyId,
      company: { id: companyId } as Company
    });

    return this.productsRepository.save(product);
  }

  async update(
    id: string,
    dto: UpdateProductDto,
    requester?: { role?: UserRole; companyId?: string | null }
  ) {
    const product = await this.productsRepository.findOne({ where: { id } });
    if (!product) {
      throw new NotFoundException('Produto não encontrado');
    }

    if (requester?.role !== 'SUPER_ADMIN') {
      if (!requester?.companyId || product.companyId !== requester.companyId) {
        throw new ForbiddenException('Sem permissão');
      }
    }

    if (dto.categoryId) {
      const categoryWhere = product.companyId
        ? { id: dto.categoryId, companyId: product.companyId }
        : { id: dto.categoryId, companyId: IsNull() };
      const category = await this.categoriesRepository.findOne({
        where: categoryWhere
      });
      if (!category) {
        throw new NotFoundException('Categoria não encontrada');
      }
      product.category = category;
    }

    if (dto.name !== undefined) product.name = dto.name;
    if (dto.sku !== undefined) product.sku = dto.sku;
    if (dto.ncm !== undefined) product.ncm = dto.ncm;
    if (dto.cest !== undefined) product.cest = dto.cest ?? null;
    if (dto.origin !== undefined) product.origin = dto.origin;
    if (dto.stock !== undefined) product.stock = dto.stock;
    if (dto.price !== undefined) product.price = dto.price;
    if (dto.barcode !== undefined) product.barcode = dto.barcode ?? null;

    if (dto.taxProfileId) {
      const taxProfileWhere = product.companyId
        ? { id: dto.taxProfileId, companyId: product.companyId }
        : { id: dto.taxProfileId, companyId: IsNull() };
      const taxProfile = await this.taxProfilesRepository.findOne({
        where: taxProfileWhere
      });
      if (!taxProfile) {
        throw new NotFoundException('Configuração tributária não encontrada');
      }
      product.taxProfileId = taxProfile.id;
      product.taxType = taxProfile.taxType;
      product.taxNcm = taxProfile.ncm ?? null;
      product.taxCest = taxProfile.cest ?? null;
    } else {
      if (dto.taxType !== undefined) product.taxType = dto.taxType ?? null;
      if (dto.taxNcm !== undefined) product.taxNcm = dto.taxNcm ?? null;
      if (dto.taxCest !== undefined) product.taxCest = dto.taxCest ?? null;
      if (dto.taxType !== undefined || dto.taxNcm !== undefined || dto.taxCest !== undefined) {
        product.taxProfileId = null;
      }
    }

    return this.productsRepository.save(product);
  }

  async remove(id: string, requester?: { role?: UserRole; companyId?: string | null }) {
    const product = await this.productsRepository.findOne({ where: { id } });
    if (!product) {
      throw new NotFoundException('Produto não encontrado');
    }
    if (requester?.role !== 'SUPER_ADMIN') {
      if (!requester?.companyId || product.companyId !== requester.companyId) {
        throw new ForbiddenException('Sem permissão');
      }
    }
    await this.productsRepository.remove(product);
    return product;
  }

  async updateImage(
    id: string,
    imageUrl: string,
    requester?: { role?: UserRole; companyId?: string | null }
  ) {
    const product = await this.productsRepository.findOne({ where: { id } });
    if (!product) {
      throw new NotFoundException('Produto não encontrado');
    }
    if (requester?.role !== 'SUPER_ADMIN') {
      if (!requester?.companyId || product.companyId !== requester.companyId) {
        throw new ForbiddenException('Sem permissão');
      }
    }
    product.imageUrl = imageUrl;
    return this.productsRepository.save(product);
  }
}
