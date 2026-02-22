import { IsIn, IsOptional, IsString, IsUUID, Length, Matches } from 'class-validator';
import { FISCAL_REGIMES, FiscalRegime } from '../tax.types';

export class ResolveFiscalRuleDto {
  @IsString()
  @Length(2, 2)
  @Matches(/^[A-Za-z]{2}$/)
  uf: string;

  @IsIn(FISCAL_REGIMES)
  regime: FiscalRegime;

  @IsOptional()
  @IsUUID()
  companyId?: string;
}
