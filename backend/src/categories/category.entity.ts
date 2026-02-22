import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Company } from '../companies/company.entity';
import { Product } from '../products/product.entity';

@Entity('categories')
export class Category {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 160 })
  name: string;

  @OneToMany(() => Product, (product) => product.category)
  products: Product[];

  @Column({ name: 'company_id', type: 'uuid', nullable: true })
  companyId?: string | null;

  @ManyToOne(() => Company, { nullable: true })
  @JoinColumn({ name: 'company_id' })
  company?: Company | null;
}
