import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn
} from 'typeorm';
import { ApiKey } from './api-key.entity';

@Entity('api_request_logs')
export class ApiRequestLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 10 })
  method: string;

  @Column({ type: 'varchar', length: 255 })
  path: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  ip?: string | null;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent?: string | null;

  @Column({ type: 'int', default: 200 })
  status: number;

  @ManyToOne(() => ApiKey, (apiKey) => apiKey.requests, { nullable: false })
  @JoinColumn({ name: 'api_key_id' })
  apiKey: ApiKey;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
