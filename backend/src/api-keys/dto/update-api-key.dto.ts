import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class UpdateApiKeyDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  rateLimitPerMinute?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
