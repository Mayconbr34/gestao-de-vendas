import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlatformSettingsService } from '../platform-settings/platform-settings.service';
import { Company } from './company.entity';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';

@Injectable()
export class CompaniesService {
  constructor(
    @InjectRepository(Company)
    private readonly companiesRepository: Repository<Company>,
    private readonly platformSettings: PlatformSettingsService
  ) {}

  async findAll() {
    return this.companiesRepository.find({
      order: { createdAt: 'DESC' }
    });
  }

  async findById(id: string) {
    return this.companiesRepository.findOne({ where: { id } });
  }

  async create(dto: CreateCompanyDto) {
    const existing = await this.companiesRepository.findOne({
      where: { cnpj: dto.cnpj }
    });
    if (existing) {
      throw new ConflictException('CNPJ já cadastrado');
    }

    const settings = await this.platformSettings.getSettings();

    const company = this.companiesRepository.create({
      legalName: dto.legalName,
      tradeName: dto.tradeName,
      cnpj: dto.cnpj,
      address: dto.address ?? null,
      addressCep: dto.addressCep ?? null,
      addressStreet: dto.addressStreet ?? null,
      addressNumber: dto.addressNumber ?? null,
      addressComplement: dto.addressComplement ?? null,
      addressNeighborhood: dto.addressNeighborhood ?? null,
      addressCity: dto.addressCity ?? null,
      addressState: dto.addressState ?? null,
      contactEmail: dto.contactEmail ?? null,
      contactPhone: dto.contactPhone ?? null,
      logoUrl: dto.logoUrl ?? null,
      primaryColor: dto.primaryColor ?? null,
      paymentGateway: settings.paymentGateway ?? null,
      enablePdv: dto.enablePdv ?? false,
      enableMarketplace: dto.enableMarketplace ?? false
    });

    return this.companiesRepository.save(company);
  }

  async update(id: string, dto: UpdateCompanyDto) {
    const company = await this.findById(id);
    if (!company) {
      throw new NotFoundException('Empresa não encontrada');
    }

    if (dto.cnpj && dto.cnpj !== company.cnpj) {
      const existing = await this.companiesRepository.findOne({
        where: { cnpj: dto.cnpj }
      });
      if (existing) {
        throw new ConflictException('CNPJ já cadastrado');
      }
      company.cnpj = dto.cnpj;
    }

    if (dto.legalName !== undefined) company.legalName = dto.legalName;
    if (dto.tradeName !== undefined) company.tradeName = dto.tradeName;
    if (dto.address !== undefined) company.address = dto.address;
    if (dto.addressCep !== undefined) company.addressCep = dto.addressCep ?? null;
    if (dto.addressStreet !== undefined) company.addressStreet = dto.addressStreet ?? null;
    if (dto.addressNumber !== undefined) company.addressNumber = dto.addressNumber ?? null;
    if (dto.addressComplement !== undefined)
      company.addressComplement = dto.addressComplement ?? null;
    if (dto.addressNeighborhood !== undefined)
      company.addressNeighborhood = dto.addressNeighborhood ?? null;
    if (dto.addressCity !== undefined) company.addressCity = dto.addressCity ?? null;
    if (dto.addressState !== undefined) company.addressState = dto.addressState ?? null;
    if (dto.contactEmail !== undefined) company.contactEmail = dto.contactEmail;
    if (dto.contactPhone !== undefined) company.contactPhone = dto.contactPhone;
    if (dto.logoUrl !== undefined) company.logoUrl = dto.logoUrl;
    if (dto.primaryColor !== undefined) company.primaryColor = dto.primaryColor;
    if (dto.enablePdv !== undefined) company.enablePdv = dto.enablePdv;
    if (dto.enableMarketplace !== undefined) company.enableMarketplace = dto.enableMarketplace;

    return this.companiesRepository.save(company);
  }
}
