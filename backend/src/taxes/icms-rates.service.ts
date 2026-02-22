import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserRole } from '../users/user.roles';
import { CreateIcmsRateDto } from './dto/create-icms-rate.dto';
import { UpdateIcmsRateDto } from './dto/update-icms-rate.dto';
import { IcmsInternalRate } from './icms-internal-rate.entity';

@Injectable()
export class IcmsRatesService {
  constructor(
    @InjectRepository(IcmsInternalRate)
    private readonly icmsRatesRepository: Repository<IcmsInternalRate>
  ) {}

  private normalizeUf(uf: string) {
    return uf.trim().toUpperCase();
  }

  async list(companyId?: string | null) {
    const qb = this.icmsRatesRepository
      .createQueryBuilder('rate')
      .select([
        'rate.id AS id',
        'rate.uf AS uf',
        'rate.rate AS rate',
        'rate.start_date AS start_date',
        'rate.end_date AS end_date',
        'rate.company_id AS company_id'
      ])
      .orderBy('rate.uf', 'ASC')
      .addOrderBy('rate.start_date', 'DESC');

    if (companyId) {
      qb.where('rate.company_id = :companyId', { companyId });
    }

    const rows = await qb.getRawMany();
    return rows.map((row) => ({
      id: row.id,
      uf: row.uf,
      rate: Number(row.rate),
      startDate: row.start_date,
      endDate: row.end_date,
      companyId: row.company_id ?? null
    }));
  }

  async create(dto: CreateIcmsRateDto, companyId: string) {
    const entity = this.icmsRatesRepository.create({
      uf: this.normalizeUf(dto.uf),
      rate: dto.rate,
      startDate: new Date(dto.startDate),
      endDate: dto.endDate ? new Date(dto.endDate) : null,
      companyId
    });

    return this.icmsRatesRepository.save(entity);
  }

  async update(
    id: string,
    dto: UpdateIcmsRateDto,
    requester?: { role?: UserRole; companyId?: string | null }
  ) {
    const rate = await this.icmsRatesRepository.findOne({ where: { id } });
    if (!rate) {
      throw new NotFoundException('Alíquota não encontrada');
    }
    if (requester?.role !== 'SUPER_ADMIN') {
      if (!requester?.companyId || rate.companyId !== requester.companyId) {
        throw new ForbiddenException('Sem permissão');
      }
    }

    if (dto.uf !== undefined) rate.uf = this.normalizeUf(dto.uf);
    if (dto.rate !== undefined) rate.rate = dto.rate;
    if (dto.startDate !== undefined) rate.startDate = new Date(dto.startDate);
    if (dto.endDate !== undefined) rate.endDate = dto.endDate ? new Date(dto.endDate) : null;

    return this.icmsRatesRepository.save(rate);
  }

  async remove(id: string, requester?: { role?: UserRole; companyId?: string | null }) {
    const rate = await this.icmsRatesRepository.findOne({ where: { id } });
    if (!rate) {
      throw new NotFoundException('Alíquota não encontrada');
    }
    if (requester?.role !== 'SUPER_ADMIN') {
      if (!requester?.companyId || rate.companyId !== requester.companyId) {
        throw new ForbiddenException('Sem permissão');
      }
    }
    await this.icmsRatesRepository.remove(rate);
    return rate;
  }

  async findCurrentRate(uf: string, companyId?: string | null) {
    const normalized = this.normalizeUf(uf);
    const qb = this.icmsRatesRepository
      .createQueryBuilder('rate')
      .where('rate.uf = :uf', { uf: normalized })
      .andWhere('rate.start_date <= CURRENT_DATE')
      .andWhere('(rate.end_date IS NULL OR rate.end_date >= CURRENT_DATE)');

    if (companyId) {
      qb.andWhere('rate.company_id = :companyId', { companyId });
    }

    return qb.orderBy('rate.start_date', 'DESC').getOne();
  }
}
