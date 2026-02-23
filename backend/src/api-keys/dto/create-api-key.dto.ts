import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, IsUUID, Min, MinLength } from 'class-validator';

export class CreateApiKeyDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  rateLimitPerMinute?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  companyId?: string;
}
