import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Company } from '../companies/company.entity';
import { Category } from '../categories/category.entity';
import { TaxProfile } from '../taxes/tax-profile.entity';

const priceTransformer = {
  to(value: number) {
    return value;
  },
  from(value: string) {
    return Number(value);
  }
};

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ name: 'sku', type: 'varchar', length: 80, nullable: true })
  sku?: string | null;

  @Column('int')
  stock: number;

  @Column('decimal', { precision: 10, scale: 2, transformer: priceTransformer })
  price: number;

  @Column({ type: 'varchar', length: 80, nullable: true })
  barcode?: string | null;

  @Column({ name: 'image_url', type: 'varchar', length: 255, nullable: true })
  imageUrl?: string | null;

  @Column({ name: 'ncm', type: 'varchar', length: 8, nullable: true })
  ncm?: string | null;

  @Column({ name: 'cest', type: 'varchar', length: 7, nullable: true })
  cest?: string | null;

  @Column({ name: 'origin', type: 'int', nullable: true })
  origin?: number | null;

  @Column({ name: 'tax_profile_id', type: 'uuid', nullable: true })
  taxProfileId?: string | null;

  @ManyToOne(() => TaxProfile, { nullable: true })
  @JoinColumn({ name: 'tax_profile_id' })
  taxProfile?: TaxProfile | null;

  @Column({ name: 'tax_type', type: 'varchar', length: 40, nullable: true })
  taxType?: string | null;

  @Column({ name: 'tax_ncm', type: 'varchar', length: 20, nullable: true })
  taxNcm?: string | null;

  @Column({ name: 'tax_cest', type: 'varchar', length: 20, nullable: true })
  taxCest?: string | null;

  @ManyToOne(() => Category, (category) => category.products, { nullable: false })
  @JoinColumn({ name: 'category_id' })
  category: Category;

  @Column({ name: 'company_id', type: 'uuid', nullable: true })
  companyId?: string | null;

  @ManyToOne(() => Company, { nullable: true })
  @JoinColumn({ name: 'company_id' })
  company?: Company | null;
}
