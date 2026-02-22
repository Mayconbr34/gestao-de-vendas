import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, IsUUID, Min, MinLength } from 'class-validator';

export class CreateApiKeyDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  rateLimitPerMinute?: number;

  @IsOptional()
  @IsUUID()
  companyId?: string;
}
