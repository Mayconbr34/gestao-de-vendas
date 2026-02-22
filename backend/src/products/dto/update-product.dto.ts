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

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  sku?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{8}$/)
  ncm?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{7}$/)
  cest?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(8)
  origin?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  stock?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  costPrice?: number;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  barcode?: string;

  @IsOptional()
  @IsUUID()
  taxProfileId?: string;

  @IsOptional()
  @IsIn(TAX_TYPES)
  taxType?: TaxType;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  taxNcm?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  taxCest?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;
}
