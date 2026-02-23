import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, Length, Matches, MinLength } from 'class-validator';

export class CreateCompanyDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  legalName: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  tradeName: string;

  @ApiProperty()
  @IsString()
  @MinLength(6)
  cnpj: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(8, 10)
  addressCep?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  addressStreet?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  addressNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  addressComplement?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  addressNeighborhood?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  addressCity?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z]{2}$/)
  addressState?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contactEmail?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contactPhone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  logoUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  primaryColor?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  enablePdv?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  enableMarketplace?: boolean;
}
