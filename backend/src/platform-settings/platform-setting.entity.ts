import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('platform_settings')
export class PlatformSetting {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'platform_name', type: 'varchar', length: 160 })
  platformName: string;

  @Column({ name: 'platform_description', type: 'varchar', length: 255, nullable: true })
  platformDescription?: string | null;

  @Column({ name: 'favicon_url', type: 'varchar', length: 255, nullable: true })
  faviconUrl?: string | null;

  @Column({ name: 'contact_email', type: 'varchar', length: 255, nullable: true })
  contactEmail?: string | null;

  @Column({ name: 'contact_phone', type: 'varchar', length: 40, nullable: true })
  contactPhone?: string | null;

  @Column({ name: 'payment_gateway', type: 'varchar', length: 120, nullable: true })
  paymentGateway?: string | null;

  @Column({ name: 'email_enabled', type: 'boolean', default: false })
  emailEnabled: boolean;

  @Column({ name: 'email_sender', type: 'varchar', length: 255, nullable: true })
  emailSender?: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
