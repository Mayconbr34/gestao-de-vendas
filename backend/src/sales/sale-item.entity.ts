import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { decimalTransformer } from '../common/decimal.transformer';
import { Sale } from './sale.entity';

@Entity('sale_items')
export class SaleItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Sale, (sale) => sale.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sale_id' })
  sale: Sale;

  /** Mantido como referência; fica nulo se o produto for removido do catálogo. */
  @Column({ name: 'product_id', type: 'uuid', nullable: true })
  productId?: string | null;

  /** Cópia do nome no momento da venda, para preservar o histórico. */
  @Column({ name: 'product_name', type: 'varchar', length: 255 })
  productName: string;

  @Column({ name: 'category_name', type: 'varchar', length: 160, nullable: true })
  categoryName?: string | null;

  @Column({ type: 'int' })
  quantity: number;

  @Column('decimal', { name: 'unit_price', precision: 12, scale: 2, transformer: decimalTransformer })
  unitPrice: number;

  @Column('decimal', {
    name: 'unit_cost',
    precision: 12,
    scale: 2,
    transformer: decimalTransformer,
    nullable: true
  })
  unitCost?: number | null;

  @Column('decimal', { precision: 12, scale: 2, transformer: decimalTransformer })
  total: number;
}
