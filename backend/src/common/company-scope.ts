import { ForbiddenException } from '@nestjs/common';
import { Request } from 'express';
import { UserRole } from '../users/user.roles';

export type Requester = {
  userId?: string;
  email?: string;
  role?: UserRole;
  companyId?: string | null;
};

export function getRequester(req: Request): Requester {
  return ((req as any).user ?? {}) as Requester;
}

/**
 * Define a empresa (tenant) usada em consultas.
 * - SUPER_ADMIN: usa a empresa informada no filtro ou null (todas as empresas).
 * - Demais perfis: sempre a própria empresa, ignorando o filtro recebido.
 */
export function resolveCompanyScope(requester: Requester, requestedCompanyId?: string | null) {
  if (requester.role === 'SUPER_ADMIN') {
    return requestedCompanyId || null;
  }
  if (!requester.companyId) {
    throw new ForbiddenException('Usuário sem empresa vinculada');
  }
  return requester.companyId;
}
