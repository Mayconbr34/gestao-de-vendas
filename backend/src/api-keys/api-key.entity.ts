import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from 'typeorm';
import { Company } from '../companies/company.entity';
import { ApiRequestLog } from './api-request-log.entity';

@Entity('api_keys')
export class ApiKey {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 160 })
  name: string;

  @Column({ name: 'api_key', type: 'varchar', unique: true, length: 120 })
  apiKey: string;

  @Column({ name: 'api_secret_hash', type: 'varchar', length: 255 })
  apiSecretHash: string;

  @Column({ name: 'rate_limit_per_minute', type: 'int', default: 60 })
  rateLimitPerMinute: number;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'last_used_at', type: 'timestamptz', nullable: true })
  lastUsedAt?: Date | null;

  @Column({ name: 'company_id', type: 'uuid', nullable: true })
  companyId?: string | null;

  @ManyToOne(() => Company, { nullable: true })
  @JoinColumn({ name: 'company_id' })
  company?: Company | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => ApiRequestLog, (log) => log.apiKey)
  requests: ApiRequestLog[];
}
