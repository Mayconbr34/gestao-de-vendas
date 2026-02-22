import { Request } from 'express';

export function getRequestIp(req: Request): string | null {
  const forwarded = req.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip ?? null;
}

export function getUserAgent(req: Request): string | null {
  return req.get('user-agent') ?? null;
}
