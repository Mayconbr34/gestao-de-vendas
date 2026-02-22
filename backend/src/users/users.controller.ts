import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Inject,
  Param,
  Post,
  Put,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  forwardRef
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { AuditsService } from '../audits/audits.service';
import { getRequestIp, getUserAgent } from '../audits/audit.utils';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { AuthService } from '../auth/auth.service';
import { createImageStorage, imageFileFilter } from '../common/upload';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';
import { UserRole } from './user.roles';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly auditsService: AuditsService,
    @Inject(forwardRef(() => AuthService))
    private readonly authService: AuthService
  ) {}

  @Get()
  findAll(@Req() req: Request, @Query('companyId') companyId?: string) {
    const requester = (req as any).user as { role?: UserRole; companyId?: string | null };
    if (requester?.role === 'SUPER_ADMIN') {
      return this.usersService.findAll(companyId);
    }
    return this.usersService.findAll(requester?.companyId ?? null);
  }

  @Get('me')
  async me(@Req() req: Request) {
    const userId = (req as any).user?.userId as string | undefined;
    if (!userId) {
      throw new ForbiddenException('Usuário não encontrado');
    }
    return this.usersService.profile(userId);
  }

  @Put('me')
  async updateMe(@Body() dto: UpdateProfileDto, @Req() req: Request) {
    const userId = (req as any).user?.userId as string | undefined;
    if (!userId) {
      throw new ForbiddenException('Usuário não encontrado');
    }
    const user = await this.usersService.updateProfile(userId, dto);
    await this.auditsService.logAction({
      action: 'UPDATE_PROFILE',
      resource: 'users',
      resourceId: userId,
      resourceName: user.email,
      userId,
      companyId: (user as any).companyId ?? null,
      ip: getRequestIp(req),
      userAgent: getUserAgent(req)
    });
    return user;
  }

  @Post('me/avatar')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: createImageStorage('avatars'),
      fileFilter: imageFileFilter,
      limits: { fileSize: 2 * 1024 * 1024 }
    })
  )
  async uploadMyAvatar(@UploadedFile() file: any, @Req() req: Request) {
    if (!file) {
      throw new BadRequestException('Imagem inválida');
    }
    const userId = (req as any).user?.userId as string | undefined;
    if (!userId) {
      throw new ForbiddenException('Usuário não encontrado');
    }
    const avatarUrl = `/uploads/avatars/${file.filename}`;
    const user = await this.usersService.updateAvatar(userId, avatarUrl);
    await this.auditsService.logAction({
      action: 'UPDATE_AVATAR',
      resource: 'users',
      resourceId: userId,
      resourceName: user.email,
      userId,
      companyId: (user as any).companyId ?? null,
      ip: getRequestIp(req),
      userAgent: getUserAgent(req)
    });
    return user;
  }

  @Post('me/change-password')
  async changeMyPassword(@Body() dto: ChangePasswordDto, @Req() req: Request) {
    const userId = (req as any).user?.userId as string | undefined;
    if (!userId) {
      throw new ForbiddenException('Usuário não encontrado');
    }
    if (dto.newPassword !== dto.confirmPassword) {
      throw new BadRequestException('Confirmação de senha inválida');
    }
    const user = await this.usersService.changePassword(userId, dto.currentPassword, dto.newPassword);
    await this.auditsService.logAction({
      action: 'CHANGE_PASSWORD',
      resource: 'users',
      resourceId: userId,
      resourceName: user.email,
      userId,
      companyId: (user as any).companyId ?? null,
      ip: getRequestIp(req),
      userAgent: getUserAgent(req)
    });
    return { ok: true };
  }

  @Post()
  async create(@Body() dto: CreateUserDto, @Req() req: Request) {
    const requester = (req as any).user as { role?: UserRole; companyId?: string | null };
    let payload: CreateUserDto = dto;
    const allowedCompanyRoles: UserRole[] = ['COMPANY_ADMIN', 'COMPANY_USER'];

    if (requester?.role === 'SUPER_ADMIN') {
      // allowed to create any role and assign company
      payload = dto;
    } else if (requester?.role === 'COMPANY_ADMIN') {
      if (!requester.companyId) {
        throw new ForbiddenException('Admin sem empresa associada');
      }
      const desiredRole =
        dto.role && allowedCompanyRoles.includes(dto.role) ? dto.role : 'COMPANY_USER';
      payload = {
        ...dto,
        role: desiredRole,
        companyId: requester.companyId
      };
    } else {
      throw new ForbiddenException('Sem permissão');
    }

    const user = await this.usersService.create(payload);
    await this.auditsService.logAction({
      action: 'CREATE_USER',
      resource: 'users',
      resourceId: user.id,
      resourceName: user.email,
      userId: (req as any).user?.userId ?? null,
      companyId: (user as any).companyId ?? null,
      ip: getRequestIp(req),
      userAgent: getUserAgent(req)
    });
    return user;
  }

  @Post(':id/reset-password')
  async generateReset(@Param('id') id: string, @Req() req: Request) {
    const requester = (req as any).user as { role?: UserRole; companyId?: string | null };
    if (requester?.role !== 'SUPER_ADMIN' && requester?.role !== 'COMPANY_ADMIN') {
      throw new ForbiddenException('Sem permissão');
    }
    const target = await this.usersService.findById(id);
    if (!target) {
      throw new ForbiddenException('Usuário não encontrado');
    }

    if (requester?.role !== 'SUPER_ADMIN') {
      if (!requester?.companyId || target.companyId !== requester.companyId) {
        throw new ForbiddenException('Sem permissão');
      }
    }

    const resetLink = await this.authService.generateResetLink(id);
    await this.auditsService.logAction({
      action: 'RESET_PASSWORD_LINK',
      resource: 'users',
      resourceId: id,
      resourceName: target.email,
      userId: (req as any).user?.userId ?? null,
      companyId: target.companyId ?? null,
      ip: getRequestIp(req),
      userAgent: getUserAgent(req)
    });
    return { resetLink };
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateUserDto, @Req() req: Request) {
    const requester = (req as any).user as { role?: UserRole; companyId?: string | null };
    const target = await this.usersService.findById(id);
    if (!target) {
      throw new ForbiddenException('Usuário não encontrado');
    }
    if (requester?.role !== 'SUPER_ADMIN') {
      const allowedCompanyRoles: UserRole[] = ['COMPANY_ADMIN', 'COMPANY_USER'];
      if (!requester?.companyId || target.companyId !== requester.companyId) {
        throw new ForbiddenException('Sem permissão');
      }
      if (target.role === 'SUPER_ADMIN') {
        throw new ForbiddenException('Sem permissão');
      }
      const desiredRole =
        dto.role && allowedCompanyRoles.includes(dto.role) ? dto.role : undefined;
      dto.role = desiredRole;
      dto.companyId = requester.companyId;
    }

    const user = await this.usersService.update(id, dto);
    await this.auditsService.logAction({
      action: 'UPDATE_USER',
      resource: 'users',
      resourceId: id,
      resourceName: user.email,
      userId: (req as any).user?.userId ?? null,
      companyId: (user as any).companyId ?? null,
      ip: getRequestIp(req),
      userAgent: getUserAgent(req)
    });
    return user;
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: Request) {
    const requester = (req as any).user as { role?: UserRole; companyId?: string | null };
    const target = await this.usersService.findById(id);
    if (!target) {
      throw new ForbiddenException('Usuário não encontrado');
    }
    if (requester?.role !== 'SUPER_ADMIN') {
      if (!requester?.companyId || target.companyId !== requester.companyId) {
        throw new ForbiddenException('Sem permissão');
      }
      if (target.role === 'SUPER_ADMIN') {
        throw new ForbiddenException('Sem permissão');
      }
    }

    const user = await this.usersService.remove(id);
    await this.auditsService.logAction({
      action: 'DELETE_USER',
      resource: 'users',
      resourceId: id,
      resourceName: user.email,
      userId: (req as any).user?.userId ?? null,
      companyId: (user as any).companyId ?? null,
      ip: getRequestIp(req),
      userAgent: getUserAgent(req)
    });
    return user;
  }
}
