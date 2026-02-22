import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { UserRole } from '../users/user.roles';
import { CreateFiscalRuleDto } from './dto/create-fiscal-rule.dto';
import { ResolveFiscalRuleDto } from './dto/resolve-fiscal-rule.dto';
import { UpdateFiscalRuleDto } from './dto/update-fiscal-rule.dto';
import { FiscalRule } from './fiscal-rule.entity';
import { IcmsRatesService } from './icms-rates.service';
import { FiscalMode, FiscalRegime } from './tax.types';

const DEFAULT_CODES: Record<FiscalRegime, Record<FiscalMode, string>> = {
  NORMAL: {
    TRIBUTADO: '00',
    ICMS_ST: '60',
    ISENTO: '40'
  },
  SIMPLES: {
    TRIBUTADO: '102',
    ICMS_ST: '500',
    ISENTO: '400'
  }
};

@Injectable()
export class FiscalRulesService {
  constructor(
    @InjectRepository(FiscalRule)
    private readonly fiscalRulesRepository: Repository<FiscalRule>,
    private readonly icmsRatesService: IcmsRatesService
  ) {}

  private normalizeUf(value: string) {
    return value.trim().toUpperCase();
  }

  private normalizeOptional(value?: string | null) {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  }

  private applyDefaults(rule: FiscalRule) {
    const regime = rule.regime;
    const mode = rule.mode;
    if (regime === 'NORMAL') {
      rule.csosn = null;
      if (!rule.cst) {
        rule.cst = DEFAULT_CODES[regime][mode];
      }
    } else {
      rule.cst = null;
      if (!rule.csosn) {
        rule.csosn = DEFAULT_CODES[regime][mode];
      }
    }
  }

  private enforceModeFields(rule: FiscalRule) {
    if (rule.mode === 'ICMS_ST') {
      if (rule.mvaRate === null || rule.mvaRate === undefined) {
        throw new BadRequestException('MVA é obrigatório para ICMS-ST');
      }
      rule.icmsRate = null;
      rule.reason = null;
    } else if (rule.mode === 'ISENTO') {
      if (!rule.reason) {
        throw new BadRequestException('Motivo é obrigatório para isenção');
      }
      rule.mvaRate = null;
      rule.stReduction = null;
      rule.stRate = null;
      rule.icmsRate = null;
    } else {
      rule.mvaRate = null;
      rule.stReduction = null;
      rule.stRate = null;
      rule.reason = null;
    }
  }

  async list(companyId?: string | null) {
    const qb = this.fiscalRulesRepository
      .createQueryBuilder('rule')
      .select([
        'rule.id AS id',
        'rule.uf AS uf',
        'rule.regime AS regime',
        'rule.mode AS mode',
        'rule.cst AS cst',
        'rule.csosn AS csosn',
        'rule.icms_rate AS icms_rate',
        'rule.mva_rate AS mva_rate',
        'rule.st_reduction AS st_reduction',
        'rule.st_rate AS st_rate',
        'rule.reason AS reason',
        'rule.priority AS priority',
        'rule.description AS description',
        'rule.company_id AS company_id'
      ])
      .orderBy('rule.uf', 'ASC')
      .addOrderBy('rule.regime', 'ASC')
      .addOrderBy('rule.priority', 'ASC');

    if (companyId) {
      qb.where('rule.company_id = :companyId', { companyId });
    }

    const rows = await qb.getRawMany();
    return rows.map((row) => ({
      id: row.id,
      uf: row.uf,
      regime: row.regime,
      mode: row.mode,
      cst: row.cst ?? null,
      csosn: row.csosn ?? null,
      icmsRate: row.icms_rate !== null && row.icms_rate !== undefined ? Number(row.icms_rate) : null,
      mvaRate: row.mva_rate !== null && row.mva_rate !== undefined ? Number(row.mva_rate) : null,
      stReduction: row.st_reduction !== null && row.st_reduction !== undefined ? Number(row.st_reduction) : null,
      stRate: row.st_rate !== null && row.st_rate !== undefined ? Number(row.st_rate) : null,
      reason: row.reason ?? null,
      priority: Number(row.priority),
      description: row.description ?? null,
      companyId: row.company_id ?? null
    }));
  }

  async create(dto: CreateFiscalRuleDto, companyId: string) {
    const rule = this.fiscalRulesRepository.create({
      uf: this.normalizeUf(dto.uf),
      regime: dto.regime.toUpperCase() as FiscalRegime,
      mode: dto.mode,
      cst: this.normalizeOptional(dto.cst),
      csosn: this.normalizeOptional(dto.csosn),
      icmsRate: dto.icmsRate ?? null,
      mvaRate: dto.mvaRate ?? null,
      stReduction: dto.stReduction ?? null,
      stRate: dto.stRate ?? null,
      reason: this.normalizeOptional(dto.reason),
      priority: dto.priority ?? 100,
      description: this.normalizeOptional(dto.description),
      companyId
    });

    this.applyDefaults(rule);
    this.enforceModeFields(rule);

    return this.fiscalRulesRepository.save(rule);
  }

  async update(
    id: string,
    dto: UpdateFiscalRuleDto,
    requester?: { role?: UserRole; companyId?: string | null }
  ) {
    const rule = await this.fiscalRulesRepository.findOne({ where: { id } });
    if (!rule) {
      throw new NotFoundException('Regra fiscal não encontrada');
    }
    if (requester?.role !== 'SUPER_ADMIN') {
      if (!requester?.companyId || rule.companyId !== requester.companyId) {
        throw new ForbiddenException('Sem permissão');
      }
    }

    if (dto.uf !== undefined) rule.uf = this.normalizeUf(dto.uf);
    if (dto.regime !== undefined) rule.regime = dto.regime.toUpperCase() as FiscalRegime;
    if (dto.mode !== undefined) rule.mode = dto.mode;
    if (dto.cst !== undefined) rule.cst = this.normalizeOptional(dto.cst);
    if (dto.csosn !== undefined) rule.csosn = this.normalizeOptional(dto.csosn);
    if (dto.icmsRate !== undefined) rule.icmsRate = dto.icmsRate ?? null;
    if (dto.mvaRate !== undefined) rule.mvaRate = dto.mvaRate ?? null;
    if (dto.stReduction !== undefined) rule.stReduction = dto.stReduction ?? null;
    if (dto.stRate !== undefined) rule.stRate = dto.stRate ?? null;
    if (dto.reason !== undefined) rule.reason = this.normalizeOptional(dto.reason);
    if (dto.priority !== undefined) rule.priority = dto.priority ?? 100;
    if (dto.description !== undefined) rule.description = this.normalizeOptional(dto.description);

    this.applyDefaults(rule);
    this.enforceModeFields(rule);

    return this.fiscalRulesRepository.save(rule);
  }

  async remove(id: string, requester?: { role?: UserRole; companyId?: string | null }) {
    const rule = await this.fiscalRulesRepository.findOne({ where: { id } });
    if (!rule) {
      throw new NotFoundException('Regra fiscal não encontrada');
    }
    if (requester?.role !== 'SUPER_ADMIN') {
      if (!requester?.companyId || rule.companyId !== requester.companyId) {
        throw new ForbiddenException('Sem permissão');
      }
    }
    await this.fiscalRulesRepository.remove(rule);
    return rule;
  }

  private async findRule(input: ResolveFiscalRuleDto, companyId: string) {
    const uf = this.normalizeUf(input.uf);
    const regime = input.regime.toUpperCase() as FiscalRegime;

    const base = this.fiscalRulesRepository
      .createQueryBuilder('rule')
      .where('rule.company_id = :companyId', { companyId })
      .andWhere('rule.uf = :uf', { uf })
      .andWhere('rule.regime = :regime', { regime });

    const order = (qb: SelectQueryBuilder<FiscalRule>) =>
      qb.orderBy('rule.priority', 'ASC').addOrderBy('rule.created_at', 'DESC');

    const found = await order(base).getOne();
    return found ?? null;
  }

  async resolve(input: ResolveFiscalRuleDto, companyId: string) {
    const rule = await this.findRule(input, companyId);
    if (!rule) {
      throw new NotFoundException('Regra fiscal não encontrada');
    }

    const response: Record<string, unknown> = {
      mode: rule.mode,
      cst: rule.cst ?? null,
      csosn: rule.csosn ?? null,
      reason: rule.reason ?? null,
      ruleId: rule.id,
      ruleDescription: rule.description ?? null
    };

    if (rule.mode === 'TRIBUTADO') {
      let icmsRate = rule.icmsRate ?? null;
      if (icmsRate === null) {
        const internalRate = await this.icmsRatesService.findCurrentRate(rule.uf, companyId);
        icmsRate = internalRate ? Number(internalRate.rate) : null;
      }
      if (icmsRate === null) {
        throw new NotFoundException('Alíquota interna não encontrada');
      }
      response.icmsRate = icmsRate;
    }

    if (rule.mode === 'ICMS_ST') {
      let stRate = rule.stRate ?? null;
      if (stRate === null) {
        const internalRate = await this.icmsRatesService.findCurrentRate(rule.uf, companyId);
        stRate = internalRate ? Number(internalRate.rate) : null;
      }
      if (stRate === null) {
        throw new NotFoundException('Alíquota interna não encontrada');
      }
      response.mvaRate = rule.mvaRate ?? null;
      response.stReduction = rule.stReduction ?? null;
      response.stRate = stRate;
    }

    return response;
  }
}
