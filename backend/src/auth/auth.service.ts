import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, MoreThan, Repository } from 'typeorm';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { PasswordResetToken } from './password-reset-token.entity';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    @InjectRepository(PasswordResetToken)
    private readonly resetTokensRepository: Repository<PasswordResetToken>
  ) {}

  async register(dto: RegisterDto) {
    return this.usersService.create(dto);
  }

  async validateUser(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) return null;
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) return null;
    return user;
  }

  async login(dto: LoginDto) {
    const user = await this.validateUser(dto.email, dto.password);
    if (!user) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId ?? null
    };
    return {
      access_token: await this.jwtService.signAsync(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name ?? null,
        role: user.role,
        companyId: user.companyId ?? null,
        avatarUrl: user.avatarUrl ?? null,
        company: user.company
          ? {
              id: user.company.id,
              tradeName: user.company.tradeName,
              primaryColor: user.company.primaryColor ?? null,
              logoUrl: user.company.logoUrl ?? null
            }
          : null
      }
    };
  }

  async generateResetLink(userId: string) {
    const token = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 2);
    const entity = this.resetTokensRepository.create({
      userId,
      tokenHash,
      expiresAt
    });
    await this.resetTokensRepository.save(entity);

    const baseUrl = this.config.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    return `${baseUrl}/redefinir-senha?token=${token}`;
  }

  async generateResetLinkForEmail(email: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) return null;
    return this.generateResetLink(user.id);
  }

  async resetPassword(token: string, password: string) {
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const reset = await this.resetTokensRepository.findOne({
      where: { tokenHash, usedAt: IsNull(), expiresAt: MoreThan(new Date()) }
    });
    if (!reset) {
      throw new BadRequestException('Token inválido ou expirado');
    }

    await this.usersService.setPassword(reset.userId, password);

    reset.usedAt = new Date();
    await this.resetTokensRepository.save(reset);
  }
}
