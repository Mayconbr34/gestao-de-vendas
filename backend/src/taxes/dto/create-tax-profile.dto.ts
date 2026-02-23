import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';
import { TAX_TYPES, TaxType } from '../tax.types';

export class CreateTaxProfileDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty()
  @IsIn(TAX_TYPES)
  taxType: TaxType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ncm?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cest?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  companyId?: string;
}
