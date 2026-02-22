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
import { FiscalMode, FiscalRegime } from './tax.types';

const percentTransformer = {
  to(value: number | null) {
    return value;
  },
  from(value: string | null) {
    return value === null ? null : Number(value);
  }
};

@Entity('fiscal_rules')
export class FiscalRule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 2 })
  uf: string;

  @Column({ type: 'varchar', length: 10 })
  regime: FiscalRegime;

  @Column({ type: 'varchar', length: 15 })
  mode: FiscalMode;

  @Column({ type: 'varchar', length: 2, nullable: true })
  cst?: string | null;

  @Column({ type: 'varchar', length: 3, nullable: true })
  csosn?: string | null;

  @Column('numeric', { name: 'icms_rate', precision: 5, scale: 2, transformer: percentTransformer, nullable: true })
  icmsRate?: number | null;

  @Column('numeric', { name: 'mva_rate', precision: 6, scale: 2, transformer: percentTransformer, nullable: true })
  mvaRate?: number | null;

  @Column('numeric', { name: 'st_reduction', precision: 6, scale: 2, transformer: percentTransformer, nullable: true })
  stReduction?: number | null;

  @Column('numeric', { name: 'st_rate', precision: 5, scale: 2, transformer: percentTransformer, nullable: true })
  stRate?: number | null;

  @Column({ type: 'text', nullable: true })
  reason?: string | null;

  @Column({ type: 'int', default: 100 })
  priority: number;

  @Column({ type: 'varchar', length: 160, nullable: true })
  description?: string | null;

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
