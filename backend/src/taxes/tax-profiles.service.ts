import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { CreateTaxProfileDto } from './dto/create-tax-profile.dto';
import { UpdateTaxProfileDto } from './dto/update-tax-profile.dto';
import { TaxProfile } from './tax-profile.entity';

@Injectable()
export class TaxProfilesService {
  constructor(
    @InjectRepository(TaxProfile)
    private readonly taxProfilesRepository: Repository<TaxProfile>
  ) {}

  async findAll(companyId?: string | null) {
    return this.taxProfilesRepository.find({
      where: companyId ? { companyId } : {},
      order: { createdAt: 'DESC' }
    });
  }

  async findById(id: string) {
    return this.taxProfilesRepository.findOne({ where: { id } });
  }

  async create(dto: CreateTaxProfileDto, companyId: string) {
    const existing = await this.taxProfilesRepository.findOne({
      where: { name: dto.name, companyId }
    });
    if (existing) {
      throw new ConflictException('Nome já cadastrado');
    }

    const profile = this.taxProfilesRepository.create({
      name: dto.name,
      taxType: dto.taxType,
      ncm: dto.ncm ?? null,
      cest: dto.cest ?? null,
      companyId
    });

    return this.taxProfilesRepository.save(profile);
  }

  async update(id: string, dto: UpdateTaxProfileDto) {
    const profile = await this.findById(id);
    if (!profile) {
      throw new NotFoundException('Configuração não encontrada');
    }

    if (dto.name && dto.name !== profile.name) {
      const existingWhere = profile.companyId
        ? { name: dto.name, companyId: profile.companyId }
        : { name: dto.name, companyId: IsNull() };
      const existing = await this.taxProfilesRepository.findOne({
        where: existingWhere
      });
      if (existing) {
        throw new ConflictException('Nome já cadastrado');
      }
      profile.name = dto.name;
    }

    if (dto.taxType !== undefined) profile.taxType = dto.taxType;
    if (dto.ncm !== undefined) profile.ncm = dto.ncm ?? null;
    if (dto.cest !== undefined) profile.cest = dto.cest ?? null;

    return this.taxProfilesRepository.save(profile);
  }

  async remove(id: string) {
    const profile = await this.findById(id);
    if (!profile) {
      throw new NotFoundException('Configuração não encontrada');
    }
    await this.taxProfilesRepository.remove(profile);
    return profile;
  }
}
