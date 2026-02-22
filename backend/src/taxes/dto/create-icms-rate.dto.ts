import { Type } from 'class-transformer';
import { IsDateString, IsNumber, IsOptional, IsString, IsUUID, Length, Matches, Max, Min } from 'class-validator';

export class CreateIcmsRateDto {
  @IsString()
  @Length(2, 2)
  @Matches(/^[A-Za-z]{2}$/)
  uf: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  rate: number;

  @IsDateString()
  startDate: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsUUID()
  companyId?: string;
}
