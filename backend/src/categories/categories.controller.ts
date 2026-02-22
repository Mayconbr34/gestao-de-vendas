import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Post,
  Query,
  Req,
  UseGuards
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { AuditsService } from '../audits/audits.service';
import { getRequestIp, getUserAgent } from '../audits/audit.utils';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserRole } from '../users/user.roles';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CategoriesService } from './categories.service';

@ApiTags('categories')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('categories')
export class CategoriesController {
  constructor(
    private readonly categoriesService: CategoriesService,
    private readonly auditsService: AuditsService
  ) {}

  @Get()
  findAll(@Req() req: Request, @Query('companyId') companyId?: string) {
    const requester = (req as any).user as { role?: UserRole; companyId?: string | null };
    if (requester?.role === 'SUPER_ADMIN') {
      return this.categoriesService.findAllWithCounts(companyId);
    }
    return this.categoriesService.findAllWithCounts(requester?.companyId ?? null);
  }

  @Post()
  async create(@Body() dto: CreateCategoryDto, @Req() req: Request) {
    const requester = (req as any).user as { role?: UserRole; companyId?: string | null };
    const companyId =
      requester?.role === 'SUPER_ADMIN' ? (dto as any).companyId : requester?.companyId;
    if (!companyId) {
      throw new ForbiddenException('Empresa não definida');
    }
    const category = await this.categoriesService.create(dto, companyId);
    await this.auditsService.logAction({
      action: 'CREATE_CATEGORY',
      resource: 'categories',
      resourceId: category.id,
      resourceName: category.name,
      userId: (req as any).user?.userId ?? null,
      companyId,
      ip: getRequestIp(req),
      userAgent: getUserAgent(req)
    });
    return category;
  }
}
