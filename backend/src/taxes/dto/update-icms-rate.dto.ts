import { Type } from 'class-transformer';
import { IsDateString, IsNumber, IsOptional, IsString, Length, Matches, Max, Min } from 'class-validator';

export class UpdateIcmsRateDto {
  @IsOptional()
  @IsString()
  @Length(2, 2)
  @Matches(/^[A-Za-z]{2}$/)
  uf?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  rate?: number;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}
