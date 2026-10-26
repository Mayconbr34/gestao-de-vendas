import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn
} from 'typeorm';
import { Company } from '../companies/company.entity';
import { User } from '../users/user.entity';
import { decimalTransformer } from '../common/decimal.transformer';
import { SaleItem } from './sale-item.entity';
import { PaymentMethod, SaleStatus } from './sales.types';

@Entity('sales')
export class Sale {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId: string;

  @ManyToOne(() => Company)
  @JoinColumn({ name: 'company_id' })
  company?: Company;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId?: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user?: User | null;

  @Column({ name: 'customer_name', type: 'varchar', length: 160, nullable: true })
  customerName?: string | null;

  @Column({ name: 'payment_method', type: 'varchar', length: 30 })
  paymentMethod: PaymentMethod;

  @Column({ type: 'varchar', length: 20, default: 'COMPLETED' })
  status: SaleStatus;

  @Column('decimal', { precision: 12, scale: 2, transformer: decimalTransformer })
  subtotal: number;

  @Column('decimal', { precision: 12, scale: 2, transformer: decimalTransformer, default: 0 })
  discount: number;

  @Column('decimal', { precision: 12, scale: 2, transformer: decimalTransformer })
  total: number;

  @Column({ name: 'items_count', type: 'int' })
  itemsCount: number;

  @OneToMany(() => SaleItem, (item) => item.sale, { cascade: true })
  items: SaleItem[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'canceled_at', type: 'timestamptz', nullable: true })
  canceledAt?: Date | null;
}
