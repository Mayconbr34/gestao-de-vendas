import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { DataSource } from 'typeorm';

@Injectable()
export class MigrationsService implements OnApplicationBootstrap {
  constructor(private readonly dataSource: DataSource) {}

  async onApplicationBootstrap() {
    await this.run();
  }

  private async run() {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      await queryRunner.startTransaction();

      await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS app_migrations (
          id SERIAL PRIMARY KEY,
          name VARCHAR(120) NOT NULL UNIQUE,
          ran_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);

      const hasMigration = async (name: string) => {
        const rows = await queryRunner.query(
          `SELECT 1 FROM app_migrations WHERE name = $1 LIMIT 1;`,
          [name]
        );
        return rows.length > 0;
      };

      const runMigration = async (name: string, fn: () => Promise<void>) => {
        if (await hasMigration(name)) return;
        await fn();
        await queryRunner.query(`INSERT INTO app_migrations (name) VALUES ($1);`, [
          name
        ]);
      };

      await runMigration('init_001', async () => {
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);

        await queryRunner.query(`
          CREATE TABLE IF NOT EXISTS users (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            email VARCHAR(255) NOT NULL UNIQUE,
            password_hash VARCHAR(255) NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          );
        `);

        await queryRunner.query(`
          CREATE TABLE IF NOT EXISTS categories (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name VARCHAR(160) NOT NULL UNIQUE
          );
        `);

        await queryRunner.query(`
          CREATE TABLE IF NOT EXISTS products (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name VARCHAR(255) NOT NULL,
            stock INT NOT NULL DEFAULT 0,
            price NUMERIC(10, 2) NOT NULL DEFAULT 0,
            category_id UUID NOT NULL REFERENCES categories(id)
          );
        `);

        const adminEmail = 'admin@admin.com';
        const adminPasswordHash = await bcrypt.hash('123456', 10);

        await queryRunner.query(
          `
            INSERT INTO users (email, password_hash)
            VALUES ($1::varchar, $2::varchar)
            ON CONFLICT (email) DO NOTHING;
          `,
          [adminEmail, adminPasswordHash]
        );
      });

      await runMigration('audit_002', async () => {
        await queryRunner.query(`
          CREATE TABLE IF NOT EXISTS audit_logs (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            action VARCHAR(120) NOT NULL,
            resource VARCHAR(120) NOT NULL,
            resource_id VARCHAR(120),
            ip VARCHAR(120),
            user_agent TEXT,
            location JSONB,
            user_id UUID REFERENCES users(id),
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          );
        `);

        await queryRunner.query(`
          CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx
          ON audit_logs (created_at DESC);
        `);
      });

      await runMigration('audit_003', async () => {
        await queryRunner.query(`
          ALTER TABLE audit_logs
          ADD COLUMN IF NOT EXISTS resource_name VARCHAR(160);
        `);
      });

      await runMigration('api_004', async () => {
        await queryRunner.query(`
          CREATE TABLE IF NOT EXISTS api_keys (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name VARCHAR(160) NOT NULL,
            api_key VARCHAR(120) NOT NULL UNIQUE,
            api_secret_hash VARCHAR(255) NOT NULL,
            rate_limit_per_minute INT NOT NULL DEFAULT 60,
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            last_used_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          );
        `);

        await queryRunner.query(`
          CREATE TABLE IF NOT EXISTS api_request_logs (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            api_key_id UUID NOT NULL REFERENCES api_keys(id),
            method VARCHAR(10) NOT NULL,
            path VARCHAR(255) NOT NULL,
            ip VARCHAR(120),
            user_agent TEXT,
            status INT NOT NULL DEFAULT 200,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          );
        `);

        await queryRunner.query(`
          CREATE INDEX IF NOT EXISTS api_request_logs_created_at_idx
          ON api_request_logs (created_at DESC);
        `);

        await queryRunner.query(`
          CREATE INDEX IF NOT EXISTS api_request_logs_key_idx
          ON api_request_logs (api_key_id);
        `);
      });

      await runMigration('admin_005', async () => {
        const adminEmail = 'admin@admin.com';
        const adminPasswordHash = await bcrypt.hash('123456', 10);

        await queryRunner.query(
          `
            INSERT INTO users (email, password_hash)
            VALUES ($1::varchar, $2::varchar)
            ON CONFLICT (email)
            DO UPDATE SET password_hash = EXCLUDED.password_hash;
          `,
          [adminEmail, adminPasswordHash]
        );
      });

      await runMigration('company_006', async () => {
        await queryRunner.query(`
          CREATE TABLE IF NOT EXISTS companies (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            legal_name VARCHAR(255) NOT NULL,
            trade_name VARCHAR(255) NOT NULL,
            cnpj VARCHAR(20) NOT NULL UNIQUE,
            address VARCHAR(255),
            contact_email VARCHAR(255),
            contact_phone VARCHAR(40),
            logo_url VARCHAR(255),
            primary_color VARCHAR(20),
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          );
        `);
      });

      await runMigration('user_007', async () => {
        await queryRunner.query(`
          ALTER TABLE users
          ADD COLUMN IF NOT EXISTS role VARCHAR(30) NOT NULL DEFAULT 'COMPANY_USER';
        `);
        await queryRunner.query(`
          ALTER TABLE users
          ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
        `);
      });

      await runMigration('catalog_008', async () => {
        await queryRunner.query(`
          ALTER TABLE categories
          ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
        `);
        await queryRunner.query(`
          ALTER TABLE products
          ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
        `);
      });

      await runMigration('api_009', async () => {
        await queryRunner.query(`
          ALTER TABLE api_keys
          ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
        `);
      });

      await runMigration('audit_010', async () => {
        await queryRunner.query(`
          ALTER TABLE audit_logs
          ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
        `);
      });

      await runMigration('admin_011', async () => {
        await queryRunner.query(
          `UPDATE users SET role = 'SUPER_ADMIN' WHERE email = $1;`,
          ['admin@admin.com']
        );
      });

      await runMigration('product_012', async () => {
        await queryRunner.query(`
          ALTER TABLE products
          ADD COLUMN IF NOT EXISTS barcode VARCHAR(80);
        `);
      });

      await runMigration('catalog_013', async () => {
        await queryRunner.query(`
          ALTER TABLE categories
          DROP CONSTRAINT IF EXISTS categories_name_key;
        `);
        await queryRunner.query(`
          CREATE UNIQUE INDEX IF NOT EXISTS categories_company_name_uq
          ON categories (company_id, name);
        `);
      });

      await runMigration('user_014', async () => {
        await queryRunner.query(`
          ALTER TABLE users
          ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(255);
        `);
      });

      await runMigration('auth_015', async () => {
        await queryRunner.query(`
          CREATE TABLE IF NOT EXISTS password_reset_tokens (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES users(id),
            token_hash VARCHAR(64) NOT NULL UNIQUE,
            expires_at TIMESTAMPTZ NOT NULL,
            used_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          );
        `);

        await queryRunner.query(`
          CREATE INDEX IF NOT EXISTS password_reset_tokens_user_idx
          ON password_reset_tokens (user_id);
        `);
      });

      await runMigration('user_016', async () => {
        await queryRunner.query(`
          ALTER TABLE users
          ADD COLUMN IF NOT EXISTS name VARCHAR(160);
        `);
      });

      await runMigration('tax_017', async () => {
        await queryRunner.query(`
          CREATE TABLE IF NOT EXISTS tax_profiles (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name VARCHAR(120) NOT NULL,
            tax_type VARCHAR(40) NOT NULL,
            ncm VARCHAR(20),
            cest VARCHAR(20),
            company_id UUID REFERENCES companies(id),
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          );
        `);
        await queryRunner.query(`
          CREATE UNIQUE INDEX IF NOT EXISTS tax_profiles_company_name_uq
          ON tax_profiles (company_id, name);
        `);
      });

      await runMigration('product_018', async () => {
        await queryRunner.query(`
          ALTER TABLE products
          ADD COLUMN IF NOT EXISTS tax_profile_id UUID REFERENCES tax_profiles(id);
        `);
        await queryRunner.query(`
          ALTER TABLE products
          ADD COLUMN IF NOT EXISTS tax_type VARCHAR(40);
        `);
        await queryRunner.query(`
          ALTER TABLE products
          ADD COLUMN IF NOT EXISTS tax_ncm VARCHAR(20);
        `);
        await queryRunner.query(`
          ALTER TABLE products
          ADD COLUMN IF NOT EXISTS tax_cest VARCHAR(20);
        `);
      });

      await runMigration('product_019', async () => {
        await queryRunner.query(`
          ALTER TABLE products
          ADD COLUMN IF NOT EXISTS sku VARCHAR(80);
        `);
        await queryRunner.query(`
          ALTER TABLE products
          ADD COLUMN IF NOT EXISTS ncm VARCHAR(8);
        `);
        await queryRunner.query(`
          ALTER TABLE products
          ADD COLUMN IF NOT EXISTS cest VARCHAR(7);
        `);
        await queryRunner.query(`
          ALTER TABLE products
          ADD COLUMN IF NOT EXISTS origin INT;
        `);
      });

      await runMigration('tax_020', async () => {
        await queryRunner.query(`
          CREATE TABLE IF NOT EXISTS icms_internal_rates (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            uf VARCHAR(2) NOT NULL,
            rate NUMERIC(5, 2) NOT NULL,
            start_date DATE NOT NULL,
            end_date DATE,
            company_id UUID REFERENCES companies(id),
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          );
        `);
        await queryRunner.query(`
          CREATE INDEX IF NOT EXISTS icms_internal_rates_company_uf_idx
          ON icms_internal_rates (company_id, uf);
        `);
      });

      await runMigration('tax_021', async () => {
        await queryRunner.query(`
          CREATE TABLE IF NOT EXISTS fiscal_rules (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            uf VARCHAR(2) NOT NULL,
            regime VARCHAR(10) NOT NULL,
            ncm VARCHAR(8),
            cest VARCHAR(7),
            mode VARCHAR(15) NOT NULL,
            cst VARCHAR(2),
            csosn VARCHAR(3),
            icms_rate NUMERIC(5, 2),
            mva_rate NUMERIC(6, 2),
            st_reduction NUMERIC(6, 2),
            st_rate NUMERIC(5, 2),
            reason TEXT,
            priority INT NOT NULL DEFAULT 100,
            description VARCHAR(160),
            company_id UUID REFERENCES companies(id),
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          );
        `);
        await queryRunner.query(`
          CREATE INDEX IF NOT EXISTS fiscal_rules_lookup_idx
          ON fiscal_rules (company_id, uf, regime, cest, ncm, priority);
        `);
      });

      await runMigration('company_022', async () => {
        await queryRunner.query(`
          ALTER TABLE companies
          ADD COLUMN IF NOT EXISTS address_cep VARCHAR(10);
        `);
        await queryRunner.query(`
          ALTER TABLE companies
          ADD COLUMN IF NOT EXISTS address_street VARCHAR(255);
        `);
        await queryRunner.query(`
          ALTER TABLE companies
          ADD COLUMN IF NOT EXISTS address_number VARCHAR(20);
        `);
        await queryRunner.query(`
          ALTER TABLE companies
          ADD COLUMN IF NOT EXISTS address_complement VARCHAR(255);
        `);
        await queryRunner.query(`
          ALTER TABLE companies
          ADD COLUMN IF NOT EXISTS address_neighborhood VARCHAR(255);
        `);
        await queryRunner.query(`
          ALTER TABLE companies
          ADD COLUMN IF NOT EXISTS address_city VARCHAR(160);
        `);
        await queryRunner.query(`
          ALTER TABLE companies
          ADD COLUMN IF NOT EXISTS address_state VARCHAR(2);
        `);
        await queryRunner.query(`
          ALTER TABLE companies
          ADD COLUMN IF NOT EXISTS payment_gateway VARCHAR(120);
        `);
        await queryRunner.query(`
          ALTER TABLE companies
          ADD COLUMN IF NOT EXISTS enable_pdv BOOLEAN NOT NULL DEFAULT FALSE;
        `);
        await queryRunner.query(`
          ALTER TABLE companies
          ADD COLUMN IF NOT EXISTS enable_marketplace BOOLEAN NOT NULL DEFAULT FALSE;
        `);
      });

      await runMigration('product_023', async () => {
        await queryRunner.query(`
          ALTER TABLE products
          ADD COLUMN IF NOT EXISTS image_url VARCHAR(255);
        `);
      });

      await runMigration('product_024', async () => {
        await queryRunner.query(`
          ALTER TABLE products
          ADD COLUMN IF NOT EXISTS cost_price NUMERIC(10, 2);
        `);
      });

      await runMigration('product_025', async () => {
        await queryRunner.query(`
          ALTER TABLE products
          DROP COLUMN IF EXISTS tax_ncm;
        `);
        await queryRunner.query(`
          ALTER TABLE products
          DROP COLUMN IF EXISTS tax_cest;
        `);
      });

      await runMigration('platform_024', async () => {
        await queryRunner.query(`
          CREATE TABLE IF NOT EXISTS platform_settings (
            id SERIAL PRIMARY KEY,
            platform_name VARCHAR(160) NOT NULL,
            contact_email VARCHAR(255),
            contact_phone VARCHAR(40),
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          );
        `);
        await queryRunner.query(`
          INSERT INTO platform_settings (id, platform_name)
          VALUES (1, 'Projeto Integrador')
          ON CONFLICT (id) DO NOTHING;
        `);
      });

      await runMigration('platform_025', async () => {
        await queryRunner.query(`
          ALTER TABLE platform_settings
          ADD COLUMN IF NOT EXISTS payment_gateway VARCHAR(120);
        `);
      });

      await runMigration('platform_026', async () => {
        await queryRunner.query(`
          ALTER TABLE platform_settings
          ADD COLUMN IF NOT EXISTS email_enabled BOOLEAN NOT NULL DEFAULT FALSE;
        `);
        await queryRunner.query(`
          ALTER TABLE platform_settings
          ADD COLUMN IF NOT EXISTS email_sender VARCHAR(255);
        `);
      });

      await runMigration('platform_027', async () => {
        await queryRunner.query(`
          ALTER TABLE platform_settings
          ADD COLUMN IF NOT EXISTS platform_description VARCHAR(255);
        `);
      });

      await runMigration('platform_028', async () => {
        await queryRunner.query(`
          ALTER TABLE platform_settings
          ADD COLUMN IF NOT EXISTS favicon_url VARCHAR(255);
        `);
      });

      // PDV: vendas e itens de venda (PI IV)
      await runMigration('sales_029', async () => {
        await queryRunner.query(`
          CREATE TABLE IF NOT EXISTS sales (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            company_id UUID NOT NULL REFERENCES companies(id),
            user_id UUID REFERENCES users(id) ON DELETE SET NULL,
            customer_name VARCHAR(160),
            payment_method VARCHAR(30) NOT NULL,
            status VARCHAR(20) NOT NULL DEFAULT 'COMPLETED',
            subtotal NUMERIC(12,2) NOT NULL,
            discount NUMERIC(12,2) NOT NULL DEFAULT 0,
            total NUMERIC(12,2) NOT NULL,
            items_count INT NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            canceled_at TIMESTAMPTZ,
            CONSTRAINT sales_total_non_negative CHECK (total >= 0),
            CONSTRAINT sales_discount_valid CHECK (discount >= 0 AND discount <= subtotal)
          );
        `);
        await queryRunner.query(`
          CREATE TABLE IF NOT EXISTS sale_items (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
            product_id UUID REFERENCES products(id) ON DELETE SET NULL,
            product_name VARCHAR(255) NOT NULL,
            category_name VARCHAR(160),
            quantity INT NOT NULL CHECK (quantity > 0),
            unit_price NUMERIC(12,2) NOT NULL,
            unit_cost NUMERIC(12,2),
            total NUMERIC(12,2) NOT NULL
          );
        `);
        await queryRunner.query(`
          CREATE INDEX IF NOT EXISTS idx_sales_company_created
          ON sales (company_id, created_at DESC);
        `);
        await queryRunner.query(`
          CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items (sale_id);
        `);
        await queryRunner.query(`
          CREATE INDEX IF NOT EXISTS idx_sale_items_product ON sale_items (product_id);
        `);
      });

      // Índices para as consultas de agregação do dashboard analítico e filtros de auditoria
      await runMigration('analytics_030', async () => {
        await queryRunner.query(`
          CREATE INDEX IF NOT EXISTS idx_audit_logs_company_created
          ON audit_logs (company_id, created_at DESC);
        `);
        await queryRunner.query(`
          CREATE INDEX IF NOT EXISTS idx_products_company ON products (company_id);
        `);
      });

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
