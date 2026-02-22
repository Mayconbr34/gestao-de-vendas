import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from 'typeorm';
import { Company } from '../companies/company.entity';
import { TaxType } from './tax.types';

@Entity('tax_profiles')
export class TaxProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 120 })
  name: string;

  @Column({ name: 'tax_type', type: 'varchar', length: 40 })
  taxType: TaxType;

  @Column({ type: 'varchar', length: 20, nullable: true })
  ncm?: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  cest?: string | null;

  @Column({ name: 'company_id', type: 'uuid', nullable: true })
  companyId?: string | null;

  @ManyToOne(() => Company, { nullable: true })
  @JoinColumn({ name: 'company_id' })
  company?: Company | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
