import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
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
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(2, 2)
  @Matches(/^[A-Za-z]{2}$/)
  uf?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsIn(FISCAL_REGIMES)
  regime?: FiscalRegime;

  @ApiPropertyOptional()
  @IsOptional()
  @IsIn(FISCAL_MODES)
  mode?: FiscalMode;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(/^\d{2}$/)
  cst?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(/^\d{3}$/)
  csosn?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  icmsRate?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(999)
  mvaRate?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  stReduction?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  stRate?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  reason?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  priority?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(160)
  description?: string;
}
