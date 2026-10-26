import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { roundMoney } from '../common/decimal.transformer';
import { Requester } from '../common/company-scope';
import { ANALYTICS_TZ, dayEndExclusiveSql, dayStartSql } from '../common/date-range';
import { Product } from '../products/product.entity';
import { CreateSaleDto } from './dto/create-sale.dto';
import { SaleItem } from './sale-item.entity';
import { Sale } from './sale.entity';

export type SaleListFilters = {
  companyId?: string | null;
  /** Dia inicial (YYYY-MM-DD), inclusive */
  from?: string | null;
  /** Dia final (YYYY-MM-DD), inclusive */
  to?: string | null;
  status?: string | null;
  limit?: number;
};

@Injectable()
export class SalesService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Sale)
    private readonly salesRepository: Repository<Sale>
  ) {}

  /**
   * Registra uma venda do PDV em uma única transação:
   * bloqueia os produtos, valida estoque, baixa o estoque e grava a venda com os itens.
   * O preço vem sempre do catálogo, nunca do cliente.
   */
  async create(dto: CreateSaleDto, companyId: string, userId?: string | null) {
    const quantities = new Map<string, number>();
    for (const item of dto.items) {
      quantities.set(item.productId, (quantities.get(item.productId) ?? 0) + item.quantity);
    }
    const productIds = Array.from(quantities.keys());

    const saleId = await this.dataSource.transaction(async (manager) => {
      // O recurso de PDV é liberado por empresa (Configurações da empresa > Recursos > PDV habilitado).
      const [company] = await manager.query(`SELECT enable_pdv FROM companies WHERE id = $1`, [
        companyId
      ]);
      if (!company) {
        throw new NotFoundException('Empresa não encontrada');
      }
      if (!company.enable_pdv) {
        throw new ForbiddenException('O PDV não está habilitado para esta empresa');
      }

      const products = await manager
        .getRepository(Product)
        .createQueryBuilder('product')
        .where('product.id IN (:...ids)', { ids: productIds })
        .andWhere('product.company_id = :companyId', { companyId })
        .setLock('pessimistic_write')
        .getMany();

      if (products.length !== productIds.length) {
        throw new NotFoundException('Um ou mais produtos não foram encontrados nesta empresa');
      }

      const categoryRows: { id: string; category_name: string | null }[] = await manager.query(
        `SELECT p.id, c.name AS category_name
           FROM products p
           LEFT JOIN categories c ON c.id = p.category_id
          WHERE p.id = ANY($1::uuid[])`,
        [productIds]
      );
      const categoryByProduct = new Map(categoryRows.map((row) => [row.id, row.category_name]));

      const items: SaleItem[] = [];
      let subtotal = 0;
      let itemsCount = 0;

      for (const product of products) {
        const quantity = quantities.get(product.id) ?? 0;
        const stock = Number(product.stock);
        if (stock < quantity) {
          throw new BadRequestException(
            `Estoque insuficiente para "${product.name}" (disponível: ${stock}, solicitado: ${quantity})`
          );
        }
        const unitPrice = Number(product.price);
        const total = roundMoney(unitPrice * quantity);
        subtotal = roundMoney(subtotal + total);
        itemsCount += quantity;

        items.push(
          manager.getRepository(SaleItem).create({
            productId: product.id,
            productName: product.name,
            categoryName: categoryByProduct.get(product.id) ?? null,
            quantity,
            unitPrice,
            unitCost:
              product.costPrice !== null && product.costPrice !== undefined
                ? Number(product.costPrice)
                : null,
            total
          })
        );

        await manager.update(Product, { id: product.id }, { stock: stock - quantity });
      }

      const discount = roundMoney(dto.discount ?? 0);
      if (discount > subtotal) {
        throw new BadRequestException('O desconto não pode ser maior que o subtotal');
      }

      const sale = manager.getRepository(Sale).create({
        companyId,
        userId: userId ?? null,
        customerName: dto.customerName?.trim() || null,
        paymentMethod: dto.paymentMethod,
        status: 'COMPLETED',
        subtotal,
        discount,
        total: roundMoney(subtotal - discount),
        itemsCount,
        items
      });

      const saved = await manager.getRepository(Sale).save(sale);
      return saved.id;
    });

    return this.findById(saleId);
  }

  async availability(companyId: string) {
    const [company] = await this.dataSource.query(
      `SELECT id, trade_name, enable_pdv FROM companies WHERE id = $1`,
      [companyId]
    );
    if (!company) {
      throw new NotFoundException('Empresa não encontrada');
    }
    return {
      enabled: Boolean(company.enable_pdv),
      companyId: company.id as string,
      companyName: company.trade_name as string,
      reason: company.enable_pdv ? null : 'O PDV não está habilitado para esta empresa'
    };
  }

  /** Cancela a venda e devolve as quantidades ao estoque. */
  async cancel(id: string, requester: Requester) {
    await this.dataSource.transaction(async (manager) => {
      const sale = await manager
        .getRepository(Sale)
        .createQueryBuilder('sale')
        .where('sale.id = :id', { id })
        .setLock('pessimistic_write')
        .getOne();

      if (!sale) {
        throw new NotFoundException('Venda não encontrada');
      }
      this.assertAccess(sale, requester);
      if (sale.status === 'CANCELED') {
        throw new BadRequestException('Esta venda já foi cancelada');
      }

      const items = await manager.getRepository(SaleItem).find({
        where: { sale: { id } }
      });
      for (const item of items) {
        if (!item.productId) continue;
        await manager.increment(Product, { id: item.productId }, 'stock', item.quantity);
      }

      await manager.update(Sale, { id }, { status: 'CANCELED', canceledAt: new Date() });
    });

    return this.findById(id);
  }

  async findById(id: string, requester?: Requester) {
    const sale = await this.salesRepository.findOne({
      where: { id },
      relations: ['items', 'user']
    });
    if (!sale) {
      throw new NotFoundException('Venda não encontrada');
    }
    if (requester) {
      this.assertAccess(sale, requester);
    }
    return this.toResponse(sale);
  }

  async list(filters: SaleListFilters) {
    const limit = Math.min(Math.max(filters.limit ?? 50, 1), 500);
    // Busca os ids primeiro (sem joins) para que o LIMIT valha por venda e não por item.
    const qb = this.salesRepository
      .createQueryBuilder('sale')
      .select('sale.id', 'id')
      .orderBy('sale.created_at', 'DESC')
      .limit(limit);

    if (filters.companyId) {
      qb.andWhere('sale.company_id = :companyId', { companyId: filters.companyId });
    }
    if (filters.from) {
      qb.andWhere(`sale.created_at >= ${dayStartSql(':from', ':tz')}`, {
        from: filters.from,
        tz: ANALYTICS_TZ
      });
    }
    if (filters.to) {
      qb.andWhere(`sale.created_at < ${dayEndExclusiveSql(':to', ':tz')}`, {
        to: filters.to,
        tz: ANALYTICS_TZ
      });
    }
    if (filters.status) {
      qb.andWhere('sale.status = :status', { status: filters.status });
    }

    const idRows = await qb.getRawMany<{ id: string }>();
    if (!idRows.length) return [];

    const sales = await this.salesRepository.find({
      where: { id: In(idRows.map((row) => row.id)) },
      relations: ['items', 'user'],
      order: { createdAt: 'DESC' }
    });
    return sales.map((sale) => this.toResponse(sale));
  }

  private assertAccess(sale: Sale, requester: Requester) {
    if (requester.role === 'SUPER_ADMIN') return;
    if (!requester.companyId || sale.companyId !== requester.companyId) {
      throw new ForbiddenException('Sem permissão');
    }
  }

  private toResponse(sale: Sale) {
    return {
      id: sale.id,
      companyId: sale.companyId,
      userEmail: sale.user?.email ?? null,
      customerName: sale.customerName ?? null,
      paymentMethod: sale.paymentMethod,
      status: sale.status,
      subtotal: Number(sale.subtotal),
      discount: Number(sale.discount),
      total: Number(sale.total),
      itemsCount: sale.itemsCount,
      createdAt: sale.createdAt,
      canceledAt: sale.canceledAt ?? null,
      items: (sale.items ?? []).map((item) => ({
        id: item.id,
        productId: item.productId ?? null,
        productName: item.productName,
        categoryName: item.categoryName ?? null,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        total: Number(item.total)
      }))
    };
  }
}
