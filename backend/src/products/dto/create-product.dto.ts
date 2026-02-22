import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min
} from 'class-validator';
import { TAX_TYPES, TaxType } from '../../taxes/tax.types';

export class CreateProductDto {
  @IsString()
  name: string;

  @IsString()
  @MaxLength(80)
  sku: string;

  @IsString()
  @Matches(/^\d{8}$/)
  ncm: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{7}$/)
  cest?: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(8)
  origin: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  stock: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price: number;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  barcode?: string;

  @IsOptional()
  @IsUUID()
  taxProfileId?: string;

  @IsIn(TAX_TYPES)
  taxType: TaxType;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  taxNcm?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  taxCest?: string;

  @IsUUID()
  categoryId: string;

  @IsOptional()
  @IsUUID()
  companyId?: string;
}
