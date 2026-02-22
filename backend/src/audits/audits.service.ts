import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './audit-log.entity';

export type AuditActionInput = {
  userId?: string | null;
  action: string;
  resource: string;
  resourceId?: string | null;
  resourceName?: string | null;
  companyId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
};

@Injectable()
export class AuditsService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditsRepository: Repository<AuditLog>,
    private readonly config: ConfigService
  ) {}

  private isPrivateIpv4(ip: string) {
    const parts = ip.split('.').map((part) => Number(part));
    if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) {
      return false;
    }
    const [a, b] = parts;
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 192 && b === 168) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    return false;
  }

  private isPrivateIp(ip: string) {
    if (!ip) return true;
    const normalized = ip.trim();
    if (!normalized) return true;
    if (normalized === '::1') return true;
    if (normalized.startsWith('::ffff:')) {
      return this.isPrivateIpv4(normalized.replace('::ffff:', ''));
    }
    if (normalized.includes(':')) {
      const lower = normalized.toLowerCase();
      if (lower.startsWith('fc') || lower.startsWith('fd')) return true;
      if (lower.startsWith('fe80')) return true;
      return false;
    }
    return this.isPrivateIpv4(normalized);
  }

  async logAction(input: AuditActionInput) {
    const log = this.auditsRepository.create({
      action: input.action,
      resource: input.resource,
      resourceName: input.resourceName ?? null,
      resourceId: input.resourceId ?? null,
      ip: input.ip ?? null,
      userAgent: input.userAgent ?? null,
      companyId: input.companyId ?? null,
      user: input.userId ? ({ id: input.userId } as any) : null
    });

    await this.auditsRepository.save(log);
  }

  async logLogin(input: AuditActionInput) {
    const location = await this.resolveLocation(input.ip ?? undefined);
    const log = this.auditsRepository.create({
      action: input.action,
      resource: input.resource,
      resourceName: input.resourceName ?? null,
      resourceId: input.resourceId ?? null,
      ip: input.ip ?? null,
      userAgent: input.userAgent ?? null,
      location,
      companyId: input.companyId ?? null,
      user: input.userId ? ({ id: input.userId } as any) : null
    });

    await this.auditsRepository.save(log);
  }

  async list(companyId?: string | null) {
    const qb = this.auditsRepository
      .createQueryBuilder('audit')
      .leftJoin('audit.user', 'user')
      .leftJoin('audit.company', 'company')
      .select([
        'audit.id AS id',
        'audit.action AS action',
        'audit.resource AS resource',
        'audit.resource_name AS resource_name',
        'audit.resource_id AS resource_id',
        'audit.ip AS ip',
        'audit.user_agent AS user_agent',
        'audit.location AS location',
        'audit.created_at AS created_at',
        'user.email AS user_email',
        'company.trade_name AS company_name'
      ])
      .orderBy('audit.created_at', 'DESC');

    if (companyId) {
      qb.where('audit.company_id = :companyId', { companyId });
    }

    const rows = await qb.getRawMany();

    return rows.map((row) => ({
      id: row.id,
      action: row.action,
      resource: row.resource,
      resourceName: row.resource_name,
      resourceId: row.resource_id,
      ip: row.ip,
      userAgent: row.user_agent,
      location: row.location,
      createdAt: row.created_at,
      userEmail: row.user_email,
      companyName: row.company_name
    }));
  }

  async resolveLocation(ip?: string) {
    if (!ip) return null;
    if (this.isPrivateIp(ip)) return null;
    const template = this.config.get<string>('GEOIP_API_URL');
    if (!template) return null;

    const url = template.includes('{ip}') ? template.replace('{ip}', ip) : template + ip;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2500);
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      if (!response.ok) return null;
      const data = (await response.json()) as Record<string, unknown>;
      if (data?.error || data?.reserved) return null;
      return data;
    } catch {
      return null;
    }
  }
}
