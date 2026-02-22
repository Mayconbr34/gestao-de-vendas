import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import { TAX_TYPES, TaxType } from '../tax.types';

export class UpdateTaxProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsIn(TAX_TYPES)
  taxType?: TaxType;

  @IsOptional()
  @IsString()
  ncm?: string;

  @IsOptional()
  @IsString()
  cest?: string;
}
