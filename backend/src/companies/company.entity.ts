import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('companies')
export class Company {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'legal_name', type: 'varchar', length: 255 })
  legalName: string;

  @Column({ name: 'trade_name', type: 'varchar', length: 255 })
  tradeName: string;

  @Column({ type: 'varchar', length: 20, unique: true })
  cnpj: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  address?: string | null;

  @Column({ name: 'address_cep', type: 'varchar', length: 10, nullable: true })
  addressCep?: string | null;

  @Column({ name: 'address_street', type: 'varchar', length: 255, nullable: true })
  addressStreet?: string | null;

  @Column({ name: 'address_number', type: 'varchar', length: 20, nullable: true })
  addressNumber?: string | null;

  @Column({ name: 'address_complement', type: 'varchar', length: 255, nullable: true })
  addressComplement?: string | null;

  @Column({ name: 'address_neighborhood', type: 'varchar', length: 255, nullable: true })
  addressNeighborhood?: string | null;

  @Column({ name: 'address_city', type: 'varchar', length: 160, nullable: true })
  addressCity?: string | null;

  @Column({ name: 'address_state', type: 'varchar', length: 2, nullable: true })
  addressState?: string | null;

  @Column({ name: 'contact_email', type: 'varchar', length: 255, nullable: true })
  contactEmail?: string | null;

  @Column({ name: 'contact_phone', type: 'varchar', length: 40, nullable: true })
  contactPhone?: string | null;

  @Column({ name: 'payment_gateway', type: 'varchar', length: 120, nullable: true })
  paymentGateway?: string | null;

  @Column({ name: 'enable_pdv', type: 'boolean', default: false })
  enablePdv: boolean;

  @Column({ name: 'enable_marketplace', type: 'boolean', default: false })
  enableMarketplace: boolean;

  @Column({ name: 'logo_url', type: 'varchar', length: 255, nullable: true })
  logoUrl?: string | null;

  @Column({ name: 'primary_color', type: 'varchar', length: 20, nullable: true })
  primaryColor?: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
