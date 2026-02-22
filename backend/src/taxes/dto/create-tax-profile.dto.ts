import { IsIn, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';
import { TAX_TYPES, TaxType } from '../tax.types';

export class CreateTaxProfileDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsIn(TAX_TYPES)
  taxType: TaxType;

  @IsOptional()
  @IsString()
  ncm?: string;

  @IsOptional()
  @IsString()
  cest?: string;

  @IsOptional()
  @IsUUID()
  companyId?: string;
}
