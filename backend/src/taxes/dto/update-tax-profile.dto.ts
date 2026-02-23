import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import { TAX_TYPES, TaxType } from '../tax.types';

export class UpdateTaxProfileDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsIn(TAX_TYPES)
  taxType?: TaxType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ncm?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cest?: string;
}
