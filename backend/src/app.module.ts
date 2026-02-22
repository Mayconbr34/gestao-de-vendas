import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { ApiKeysModule } from './api-keys/api-keys.module';
import { AuditsModule } from './audits/audits.module';
import { CompaniesModule } from './companies/companies.module';
import { CategoriesModule } from './categories/categories.module';
import { ProductsModule } from './products/products.module';
import { TaxProfilesModule } from './taxes/tax-profiles.module';
import { IcmsRatesModule } from './taxes/icms-rates.module';
import { FiscalRulesModule } from './taxes/fiscal-rules.module';
import { UsersModule } from './users/users.module';
import { MigrationsModule } from './migrations/migrations.module';
import { PlatformSettingsModule } from './platform-settings/platform-settings.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST'),
        port: Number(config.get<string>('DB_PORT', '5432')),
        username: config.get<string>('DB_USER'),
        password: config.get<string>('DB_PASSWORD'),
        database: config.get<string>('DB_NAME'),
        autoLoadEntities: true,
        synchronize: config.get<string>('DB_SYNC') === 'true'
      })
    }),
    AuthModule,
    ApiKeysModule,
    AuditsModule,
    CompaniesModule,
    UsersModule,
    ProductsModule,
    CategoriesModule,
    TaxProfilesModule,
    IcmsRatesModule,
    FiscalRulesModule,
    PlatformSettingsModule,
    MigrationsModule
  ]
})
export class AppModule {}
