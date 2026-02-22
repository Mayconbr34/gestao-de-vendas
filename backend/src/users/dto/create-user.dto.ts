import { IsEmail, IsIn, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';
import { USER_ROLES, UserRole } from '../user.roles';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsOptional()
  @IsString()
  @IsIn(USER_ROLES)
  role?: UserRole;

  @IsOptional()
  @IsUUID()
  companyId?: string;
}
