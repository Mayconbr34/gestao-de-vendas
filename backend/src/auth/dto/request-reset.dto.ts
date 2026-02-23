import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class RequestResetDto {
  @ApiProperty()
  @IsEmail()
  email: string;
}
