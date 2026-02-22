import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  MaxLength,
  Min
} from 'class-validator';
import { FISCAL_MODES, FISCAL_REGIMES, FiscalMode, FiscalRegime } from '../tax.types';

export class UpdateFiscalRuleDto {
  @IsOptional()
  @IsString()
  @Length(2, 2)
  @Matches(/^[A-Za-z]{2}$/)
  uf?: string;

  @IsOptional()
  @IsIn(FISCAL_REGIMES)
  regime?: FiscalRegime;

  @IsOptional()
  @IsIn(FISCAL_MODES)
  mode?: FiscalMode;

  @IsOptional()
  @IsString()
  @Matches(/^\d{2}$/)
  cst?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{3}$/)
  csosn?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  icmsRate?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(999)
  mvaRate?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  stReduction?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  stRate?: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  reason?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  priority?: number;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  description?: string;
}
