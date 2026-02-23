import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>
  ) {}

  private sanitize(user: User) {
    const company = user.company
      ? {
          id: user.company.id,
          tradeName: user.company.tradeName,
          primaryColor: user.company.primaryColor ?? null,
          logoUrl: user.company.logoUrl ?? null
        }
      : null;
    return {
      id: user.id,
      email: user.email,
      name: user.name ?? null,
      role: user.role,
      avatarUrl: user.avatarUrl ?? null,
      companyId: user.companyId ?? null,
      companyName: user.company?.tradeName ?? null,
      company,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
  }

  async findAll(companyId?: string | null) {
    const users = await this.usersRepository.find({
      where: companyId ? { companyId } : {},
      relations: ['company'],
      select: ['id', 'email', 'name', 'role', 'avatarUrl', 'companyId', 'createdAt', 'updatedAt']
    });
    return users.map((user) => this.sanitize(user as User));
  }

  async findByEmail(email: string) {
    return this.usersRepository.findOne({ where: { email }, relations: ['company'] });
  }

  async findById(id: string) {
    return this.usersRepository.findOne({ where: { id }, relations: ['company'] });
  }

  async profile(id: string) {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }
    return this.sanitize(user);
  }

  async updateProfile(id: string, dto: { name?: string }) {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }
    if (dto.name !== undefined) {
      user.name = dto.name;
    }
    await this.usersRepository.save(user);
    return this.sanitize(user);
  }

  async create(dto: CreateUserDto) {
    const existing = await this.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email já cadastrado');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = this.usersRepository.create({
      email: dto.email,
      name: dto.name ?? null,
      passwordHash,
      role: dto.role ?? 'COMPANY_USER',
      companyId: dto.companyId ?? null
    });
    const saved = await this.usersRepository.save(user);
    return this.sanitize(saved);
  }

  async update(id: string, dto: UpdateUserDto) {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    if (dto.email && dto.email !== user.email) {
      const existing = await this.findByEmail(dto.email);
      if (existing) {
        throw new ConflictException('Email já cadastrado');
      }
      user.email = dto.email;
    }

    if (dto.password) {
      user.passwordHash = await bcrypt.hash(dto.password, 10);
    }

    if (dto.name !== undefined) {
      user.name = dto.name;
    }

    if (dto.role) {
      user.role = dto.role;
    }

    if (dto.companyId !== undefined) {
      user.companyId = dto.companyId ?? null;
    }

    const saved = await this.usersRepository.save(user);
    return this.sanitize(saved);
  }

  async setPassword(id: string, password: string) {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }
    user.passwordHash = await bcrypt.hash(password, 10);
    await this.usersRepository.save(user);
    return this.sanitize(user);
  }

  async changePassword(id: string, currentPassword: string, newPassword: string) {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }
    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      throw new BadRequestException('Senha atual inválida');
    }
    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await this.usersRepository.save(user);
    return this.sanitize(user);
  }

  async updateAvatar(id: string, avatarUrl: string | null) {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }
    user.avatarUrl = avatarUrl;
    await this.usersRepository.save(user);
    return this.sanitize(user);
  }

  async remove(id: string) {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }
    await this.usersRepository.remove(user);
    return this.sanitize(user);
  }
}
