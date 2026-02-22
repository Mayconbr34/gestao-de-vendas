import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn
} from 'typeorm';
import { Company } from '../companies/company.entity';
import { User } from '../users/user.entity';

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 120 })
  action: string;

  @Column({ length: 120 })
  resource: string;

  @Column({ name: 'resource_name', type: 'varchar', length: 160, nullable: true })
  resourceName?: string | null;

  @Column({ name: 'resource_id', type: 'varchar', length: 120, nullable: true })
  resourceId?: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  ip?: string | null;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent?: string | null;

  @Column({ type: 'jsonb', nullable: true })
  location?: Record<string, unknown> | null;

  @Column({ name: 'company_id', type: 'uuid', nullable: true })
  companyId?: string | null;

  @ManyToOne(() => Company, { nullable: true })
  @JoinColumn({ name: 'company_id' })
  company?: Company | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user?: User | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
