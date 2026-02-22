import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { AuditsService } from '../audits/audits.service';
import { getRequestIp, getUserAgent } from '../audits/audit.utils';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { createImageStorage, imageFileFilter } from '../common/upload';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { CompaniesService } from './companies.service';

@ApiTags('companies')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('companies')
export class CompaniesController {
  constructor(
    private readonly companiesService: CompaniesService,
    private readonly auditsService: AuditsService
  ) {}

  @Get()
  @Roles('SUPER_ADMIN')
  list() {
    return this.companiesService.findAll();
  }

  @Get('me')
  @Roles('COMPANY_ADMIN', 'SUPER_ADMIN')
  async getMine(@Req() req: Request) {
    const requester = (req as any).user as { companyId?: string | null };
    if (!requester?.companyId) {
      throw new BadRequestException('Empresa não definida');
    }
    const company = await this.companiesService.findById(requester.companyId);
    if (!company) {
      throw new BadRequestException('Empresa não encontrada');
    }
    return company;
  }

  @Get(':id')
  @Roles('SUPER_ADMIN')
  async getById(@Param('id') id: string) {
    const company = await this.companiesService.findById(id);
    if (!company) {
      throw new BadRequestException('Empresa não encontrada');
    }
    return company;
  }

  @Post()
  @Roles('SUPER_ADMIN')
  async create(@Body() dto: CreateCompanyDto, @Req() req: Request) {
    const company = await this.companiesService.create(dto);
    await this.auditsService.logAction({
      action: 'CREATE_COMPANY',
      resource: 'companies',
      resourceId: company.id,
      resourceName: company.tradeName,
      companyId: company.id,
      userId: (req as any).user?.userId ?? null,
      ip: getRequestIp(req),
      userAgent: getUserAgent(req)
    });
    return company;
  }

  @Put('me')
  @Roles('COMPANY_ADMIN', 'SUPER_ADMIN')
  async updateMine(@Body() dto: UpdateCompanyDto, @Req() req: Request) {
    const requester = (req as any).user as { companyId?: string | null };
    if (!requester?.companyId) {
      throw new BadRequestException('Empresa não definida');
    }
    const company = await this.companiesService.update(requester.companyId, dto);
    await this.auditsService.logAction({
      action: 'UPDATE_COMPANY',
      resource: 'companies',
      resourceId: company.id,
      resourceName: company.tradeName,
      companyId: company.id,
      userId: (req as any).user?.userId ?? null,
      ip: getRequestIp(req),
      userAgent: getUserAgent(req)
    });
    return company;
  }

  @Put(':id')
  @Roles('SUPER_ADMIN')
  async update(@Param('id') id: string, @Body() dto: UpdateCompanyDto, @Req() req: Request) {
    const company = await this.companiesService.update(id, dto);
    await this.auditsService.logAction({
      action: 'UPDATE_COMPANY',
      resource: 'companies',
      resourceId: company.id,
      resourceName: company.tradeName,
      companyId: company.id,
      userId: (req as any).user?.userId ?? null,
      ip: getRequestIp(req),
      userAgent: getUserAgent(req)
    });
    return company;
  }

  @Post('me/logo')
  @Roles('COMPANY_ADMIN', 'SUPER_ADMIN')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: createImageStorage('companies'),
      fileFilter: imageFileFilter,
      limits: { fileSize: 3 * 1024 * 1024 }
    })
  )
  async uploadMyLogo(@UploadedFile() file: any, @Req() req: Request) {
    if (!file) {
      throw new BadRequestException('Imagem inválida');
    }
    const requester = (req as any).user as { companyId?: string | null };
    if (!requester?.companyId) {
      throw new BadRequestException('Empresa não definida');
    }
    const logoUrl = `/uploads/companies/${file.filename}`;
    const company = await this.companiesService.update(requester.companyId, { logoUrl });
    await this.auditsService.logAction({
      action: 'UPDATE_COMPANY_LOGO',
      resource: 'companies',
      resourceId: company.id,
      resourceName: company.tradeName,
      companyId: company.id,
      userId: (req as any).user?.userId ?? null,
      ip: getRequestIp(req),
      userAgent: getUserAgent(req)
    });
    return company;
  }

  @Post(':id/logo')
  @Roles('SUPER_ADMIN')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: createImageStorage('companies'),
      fileFilter: imageFileFilter,
      limits: { fileSize: 3 * 1024 * 1024 }
    })
  )
  async uploadLogo(@Param('id') id: string, @UploadedFile() file: any, @Req() req: Request) {
    if (!file) {
      throw new BadRequestException('Imagem inválida');
    }
    const logoUrl = `/uploads/companies/${file.filename}`;
    const company = await this.companiesService.update(id, { logoUrl });
    await this.auditsService.logAction({
      action: 'UPDATE_COMPANY_LOGO',
      resource: 'companies',
      resourceId: company.id,
      resourceName: company.tradeName,
      companyId: company.id,
      userId: (req as any).user?.userId ?? null,
      ip: getRequestIp(req),
      userAgent: getUserAgent(req)
    });
    return company;
  }
}
