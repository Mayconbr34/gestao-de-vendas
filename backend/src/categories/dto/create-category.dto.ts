import { IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class CreateCategoryDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsOptional()
  @IsUUID()
  companyId?: string;
}
