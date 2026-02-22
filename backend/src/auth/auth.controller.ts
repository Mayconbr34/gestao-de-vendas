import { BadRequestException, Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { AuditsService } from '../audits/audits.service';
import { getRequestIp, getUserAgent } from '../audits/audit.utils';
import { PlatformSettingsService } from '../platform-settings/platform-settings.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RequestResetDto } from './dto/request-reset.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly auditsService: AuditsService,
    private readonly platformSettings: PlatformSettingsService
  ) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  async login(@Body() dto: LoginDto, @Req() req: Request) {
    const result = await this.authService.login(dto);
    await this.auditsService.logLogin({
      action: 'LOGIN',
      resource: 'auth',
      resourceName: result.user.email,
      userId: result.user.id,
      companyId: result.user.companyId ?? null,
      ip: getRequestIp(req),
      userAgent: getUserAgent(req)
    });
    return result;
  }

  @UseGuards(JwtAuthGuard)
  @Get('session')
  async session(@Req() req: Request) {
    const ip = getRequestIp(req);
    const userAgent = getUserAgent(req);
    const location = await this.auditsService.resolveLocation(ip ?? undefined);
    return {
      ip,
      userAgent,
      location
    };
  }

  @Post('reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.authService.resetPassword(dto.token, dto.password);
    return { message: 'Senha redefinida com sucesso.' };
  }

  @Post('request-reset')
  async requestReset(@Body() dto: RequestResetDto) {
    const settings = await this.platformSettings.getSettings();
    if (!settings.emailEnabled) {
      throw new BadRequestException('Recuperação de senha desativada.');
    }
    const resetLink = await this.authService.generateResetLinkForEmail(dto.email);
    return {
      message: 'Se o email estiver cadastrado, enviaremos instruções.',
      resetLink
    };
  }
}
