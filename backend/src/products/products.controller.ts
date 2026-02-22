import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Post,
  Put,
  Query,
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
import { createImageStorage, imageFileFilter } from '../common/upload';
import { UserRole } from '../users/user.roles';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductsService } from './products.service';

@ApiTags('products')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('products')
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly auditsService: AuditsService
  ) {}

  @Get()
  findAll(@Req() req: Request, @Query('companyId') companyId?: string) {
    const requester = (req as any).user as { role?: UserRole; companyId?: string | null };
    if (requester?.role === 'SUPER_ADMIN') {
      return this.productsService.findAll(companyId);
    }
    return this.productsService.findAll(requester?.companyId ?? null);
  }

  @Get(':id')
  async getById(@Param('id') id: string, @Req() req: Request) {
    const requester = (req as any).user as { role?: UserRole; companyId?: string | null };
    return this.productsService.findById(id, requester);
  }

  @Post()
  async create(@Body() dto: CreateProductDto, @Req() req: Request) {
    const requester = (req as any).user as { role?: UserRole; companyId?: string | null };
    const companyId =
      requester?.role === 'SUPER_ADMIN' ? (dto as any).companyId : requester?.companyId;
    if (!companyId) {
      throw new ForbiddenException('Empresa não definida');
    }
    const product = await this.productsService.create(dto, companyId);
    await this.auditsService.logAction({
      action: 'CREATE_PRODUCT',
      resource: 'products',
      resourceId: product.id,
      resourceName: product.name,
      userId: (req as any).user?.userId ?? null,
      companyId,
      ip: getRequestIp(req),
      userAgent: getUserAgent(req)
    });
    return product;
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateProductDto, @Req() req: Request) {
    const requester = (req as any).user as { role?: UserRole; companyId?: string | null };
    const product = await this.productsService.update(id, dto, requester);
    await this.auditsService.logAction({
      action: 'UPDATE_PRODUCT',
      resource: 'products',
      resourceId: id,
      resourceName: product.name,
      userId: (req as any).user?.userId ?? null,
      companyId: (product as any).companyId ?? null,
      ip: getRequestIp(req),
      userAgent: getUserAgent(req)
    });
    return product;
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: Request) {
    const requester = (req as any).user as { role?: UserRole; companyId?: string | null };
    const product = await this.productsService.remove(id, requester);
    await this.auditsService.logAction({
      action: 'DELETE_PRODUCT',
      resource: 'products',
      resourceId: id,
      resourceName: product.name,
      userId: (req as any).user?.userId ?? null,
      companyId: (product as any).companyId ?? null,
      ip: getRequestIp(req),
      userAgent: getUserAgent(req)
    });
    return product;
  }

  @Post(':id/image')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: createImageStorage('products'),
      fileFilter: imageFileFilter,
      limits: { fileSize: 3 * 1024 * 1024 }
    })
  )
  async uploadImage(@Param('id') id: string, @UploadedFile() file: any, @Req() req: Request) {
    if (!file) {
      throw new BadRequestException('Imagem inválida');
    }
    const requester = (req as any).user as { role?: UserRole; companyId?: string | null };
    const imageUrl = `/uploads/products/${file.filename}`;
    const product = await this.productsService.updateImage(id, imageUrl, requester);
    await this.auditsService.logAction({
      action: 'UPDATE_PRODUCT_IMAGE',
      resource: 'products',
      resourceId: id,
      resourceName: product.name,
      userId: (req as any).user?.userId ?? null,
      companyId: (product as any).companyId ?? null,
      ip: getRequestIp(req),
      userAgent: getUserAgent(req)
    });
    return product;
  }
}
