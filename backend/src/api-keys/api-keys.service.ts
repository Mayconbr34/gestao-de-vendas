import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { Repository } from 'typeorm';
import { ApiRequestLog } from './api-request-log.entity';
import { ApiKey } from './api-key.entity';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { UpdateApiKeyDto } from './dto/update-api-key.dto';

@Injectable()
export class ApiKeysService {
  constructor(
    @InjectRepository(ApiKey)
    private readonly apiKeysRepository: Repository<ApiKey>,
    @InjectRepository(ApiRequestLog)
    private readonly apiRequestRepository: Repository<ApiRequestLog>,
    private readonly config: ConfigService
  ) {}

  private generateKey(prefix: string, size: number) {
    return `${prefix}_${randomBytes(size).toString('hex')}`;
  }

  async create(dto: CreateApiKeyDto, companyId?: string | null) {
    const apiKey = this.generateKey('ak', 16);
    const apiSecret = this.generateKey('sk', 24);
    const apiSecretHash = await bcrypt.hash(apiSecret, 10);
    const rateLimit =
      dto.rateLimitPerMinute ??
      Number(this.config.get<string>('API_RATE_LIMIT_DEFAULT', '60'));

    const entity = this.apiKeysRepository.create({
      name: dto.name,
      apiKey,
      apiSecretHash,
      rateLimitPerMinute: rateLimit,
      isActive: true,
      companyId: companyId ?? null
    });

    const saved = await this.apiKeysRepository.save(entity);

    return {
      id: saved.id,
      name: saved.name,
      apiKey: saved.apiKey,
      apiSecret,
      rateLimitPerMinute: saved.rateLimitPerMinute,
      createdAt: saved.createdAt,
      companyId: saved.companyId ?? null
    };
  }

  async list(companyId?: string | null) {
    const qb = this.apiKeysRepository
      .createQueryBuilder('apiKey')
      .leftJoin('apiKey.requests', 'request')
      .leftJoin('apiKey.company', 'company')
      .select([
        'apiKey.id AS id',
        'apiKey.name AS name',
        'apiKey.api_key AS api_key',
        'apiKey.rate_limit_per_minute AS rate_limit_per_minute',
        'apiKey.is_active AS is_active',
        'apiKey.created_at AS created_at',
        'apiKey.last_used_at AS last_used_at',
        'apiKey.company_id AS company_id',
        'company.trade_name AS company_name'
      ])
      .addSelect('COUNT(request.id)', 'total_requests')
      .addSelect(
        `SUM(CASE WHEN request.created_at >= NOW() - INTERVAL '1 hour' THEN 1 ELSE 0 END)`,
        'requests_last_hour'
      )
      .groupBy('apiKey.id')
      .addGroupBy('company.trade_name')
      .orderBy('apiKey.created_at', 'DESC');

    if (companyId) {
      qb.where('apiKey.company_id = :companyId', { companyId });
    }

    const rows = await qb.getRawMany();

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      apiKey: row.api_key,
      rateLimitPerMinute: Number(row.rate_limit_per_minute),
      isActive: row.is_active,
      createdAt: row.created_at,
      lastUsedAt: row.last_used_at,
      companyId: row.company_id,
      companyName: row.company_name ?? null,
      totalRequests: Number(row.total_requests || 0),
      requestsLastHour: Number(row.requests_last_hour || 0)
    }));
  }

  async listRequests(apiKeyId: string, limit = 50) {
    return this.apiRequestRepository.find({
      where: { apiKey: { id: apiKeyId } },
      order: { createdAt: 'DESC' },
      take: limit
    });
  }

  async findById(id: string) {
    return this.apiKeysRepository.findOne({ where: { id } });
  }

  async update(
    id: string,
    dto: UpdateApiKeyDto,
    requester?: { role?: string; companyId?: string | null }
  ) {
    const key = await this.apiKeysRepository.findOne({ where: { id } });
    if (!key) {
      throw new NotFoundException('API Key não encontrada');
    }
    if (requester?.role !== 'SUPER_ADMIN') {
      if (!requester?.companyId || key.companyId !== requester.companyId) {
        throw new NotFoundException('API Key não encontrada');
      }
    }

    if (dto.name !== undefined) key.name = dto.name;
    if (dto.rateLimitPerMinute !== undefined)
      key.rateLimitPerMinute = dto.rateLimitPerMinute;
    if (dto.isActive !== undefined) key.isActive = dto.isActive;

    return this.apiKeysRepository.save(key);
  }

  async remove(id: string, requester?: { role?: string; companyId?: string | null }) {
    const key = await this.apiKeysRepository.findOne({ where: { id } });
    if (!key) {
      throw new NotFoundException('API Key não encontrada');
    }
    if (requester?.role !== 'SUPER_ADMIN') {
      if (!requester?.companyId || key.companyId !== requester.companyId) {
        throw new NotFoundException('API Key não encontrada');
      }
    }
    await this.apiRequestRepository
      .createQueryBuilder()
      .delete()
      .from(ApiRequestLog)
      .where('api_key_id = :id', { id })
      .execute();

    await this.apiKeysRepository.delete({ id });
    return key;
  }

  async validate(apiKey: string, apiSecret: string) {
    const key = await this.apiKeysRepository.findOne({
      where: { apiKey, isActive: true }
    });
    if (!key) return null;

    const match = await bcrypt.compare(apiSecret, key.apiSecretHash);
    if (!match) return null;

    key.lastUsedAt = new Date();
    await this.apiKeysRepository.save(key);
    return key;
  }

  async isRateLimited(apiKeyId: string, limit: number) {
    const count = await this.apiRequestRepository
      .createQueryBuilder('log')
      .where('log.api_key_id = :apiKeyId', { apiKeyId })
      .andWhere("log.created_at >= NOW() - INTERVAL '1 minute'")
      .getCount();

    return count >= limit;
  }

  async logRequest(input: {
    apiKeyId: string;
    method: string;
    path: string;
    ip?: string | null;
    userAgent?: string | null;
    status?: number;
  }) {
    const log = this.apiRequestRepository.create({
      apiKey: { id: input.apiKeyId } as ApiKey,
      method: input.method,
      path: input.path,
      ip: input.ip ?? null,
      userAgent: input.userAgent ?? null,
      status: input.status ?? 200
    });

    await this.apiRequestRepository.save(log);
  }
}
