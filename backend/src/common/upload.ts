import { BadRequestException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { diskStorage } from 'multer';

export const getUploadRoot = () => {
  const configured = process.env.UPLOAD_DIR;
  if (configured) {
    return path.isAbsolute(configured)
      ? configured
      : path.join(process.cwd(), configured);
  }
  return path.join(process.cwd(), 'uploads');
};

export const ensureUploadDir = (subdir: string) => {
  const dir = path.join(getUploadRoot(), subdir);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
};

export const imageFileFilter = (
  _req: any,
  file: { mimetype?: string },
  cb: (error: Error | null, acceptFile: boolean) => void
) => {
  if (!file?.mimetype?.startsWith('image/')) {
    return cb(new BadRequestException('Arquivo de imagem inválido'), false);
  }
  return cb(null, true);
};

export const createImageStorage = (subdir: string) => {
  const destination = ensureUploadDir(subdir);
  return diskStorage({
    destination,
    filename: (
      _req: any,
      file: { originalname: string },
      cb: (error: Error | null, filename: string) => void
    ) => {
      const ext = path.extname(file.originalname || '');
      const name = `${Date.now()}-${randomBytes(6).toString('hex')}${ext}`;
      cb(null, name);
    }
  });
};
