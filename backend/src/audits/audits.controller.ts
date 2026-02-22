import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuditsService } from './audits.service';
import { UserRole } from '../users/user.roles';

@ApiTags('audits')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('audits')
export class AuditsController {
  constructor(private readonly auditsService: AuditsService) {}

  @Get()
  list(@Req() req: Request) {
    const requester = (req as any).user as { role?: UserRole; companyId?: string | null; userId?: string };
    if (requester?.role === 'SUPER_ADMIN') {
      return this.auditsService.list();
    }
    if (requester?.role === 'COMPANY_USER') {
      return this.auditsService.list({ userId: requester.userId });
    }
    return this.auditsService.list({ companyId: requester?.companyId ?? null });
  }
}
