import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdatePlatformSettingDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  platformName?: string;

  @IsOptional()
  @IsString()
  platformDescription?: string;

  @IsOptional()
  @IsString()
  faviconUrl?: string;

  @IsOptional()
  @IsString()
  contactEmail?: string;

  @IsOptional()
  @IsString()
  contactPhone?: string;

  @IsOptional()
  @IsString()
  paymentGateway?: string;

  @IsOptional()
  @IsBoolean()
  emailEnabled?: boolean;

  @IsOptional()
  @IsString()
  emailSender?: string;
}
