import { IsBoolean, IsOptional, IsString, Length, Matches, MinLength } from 'class-validator';

export class UpdateCompanyDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  legalName?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  tradeName?: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  cnpj?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  @Length(8, 10)
  addressCep?: string;

  @IsOptional()
  @IsString()
  addressStreet?: string;

  @IsOptional()
  @IsString()
  addressNumber?: string;

  @IsOptional()
  @IsString()
  addressComplement?: string;

  @IsOptional()
  @IsString()
  addressNeighborhood?: string;

  @IsOptional()
  @IsString()
  addressCity?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z]{2}$/)
  addressState?: string;

  @IsOptional()
  @IsString()
  contactEmail?: string;

  @IsOptional()
  @IsString()
  contactPhone?: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsString()
  primaryColor?: string;

  @IsOptional()
  @IsBoolean()
  enablePdv?: boolean;

  @IsOptional()
  @IsBoolean()
  enableMarketplace?: boolean;
}
