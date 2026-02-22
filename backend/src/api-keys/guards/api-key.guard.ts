import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException
} from '@nestjs/common';
import { Request } from 'express';
import { getRequestIp, getUserAgent } from '../../audits/audit.utils';
import { ApiKeysService } from '../api-keys.service';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const apiKeyHeader = req.headers['x-api-key'];
    const apiSecretHeader = req.headers['x-api-secret'];

    const apiKey = Array.isArray(apiKeyHeader)
      ? apiKeyHeader[0]
      : apiKeyHeader;
    const apiSecret = Array.isArray(apiSecretHeader)
      ? apiSecretHeader[0]
      : apiSecretHeader;

    if (!apiKey || !apiSecret) {
      throw new UnauthorizedException('API Key inválida');
    }

    const key = await this.apiKeysService.validate(apiKey, apiSecret);
    if (!key) {
      throw new UnauthorizedException('API Key inválida');
    }

    const limit = key.rateLimitPerMinute ?? 60;
    const limited = await this.apiKeysService.isRateLimited(key.id, limit);
    if (limited) {
      await this.apiKeysService.logRequest({
        apiKeyId: key.id,
        method: req.method,
        path: req.originalUrl,
        ip: getRequestIp(req),
        userAgent: getUserAgent(req),
        status: 429
      });
      throw new HttpException('Rate limit excedido', HttpStatus.TOO_MANY_REQUESTS);
    }

    await this.apiKeysService.logRequest({
      apiKeyId: key.id,
      method: req.method,
      path: req.originalUrl,
      ip: getRequestIp(req),
      userAgent: getUserAgent(req),
      status: 200
    });

    (req as any).apiKey = { id: key.id, name: key.name, companyId: key.companyId ?? null };
    return true;
  }
}
