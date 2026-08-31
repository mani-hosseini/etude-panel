import { randomBytes } from 'crypto';
import { existsSync } from 'fs';
import { mkdir, readFile, unlink, writeFile } from 'fs/promises';
import { dirname, join } from 'path';
import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response, NextFunction } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import {
  IMAGE_MIME_EXT,
  type UploadKind,
} from './image-upload';

const KEY_PATTERN = /^(attachments|slides|avatars)\/[A-Za-z0-9._-]+$/;

export type StoredUpload = {
  path: string;
  filename: string;
  mimeType: string;
  size: number;
};

@Injectable()
export class UploadsService {
  private readonly logger = new Logger(UploadsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  rootDir() {
    const configured = this.config.get<string>('uploadDir')?.trim();
    return configured || join(process.cwd(), 'uploads');
  }

  async save(
    kind: UploadKind,
    file: {
      buffer?: Buffer;
      path?: string;
      mimetype: string;
      size: number;
      originalname?: string;
    },
  ): Promise<StoredUpload> {
    const buffer = await this.toBuffer(file);
    const ext = IMAGE_MIME_EXT[file.mimetype];
    if (!ext) {
      throw new BadRequestException(
        'فقط تصویرهای JPG، PNG، WEBP یا GIF مجاز هستند.',
      );
    }

    const filename = `${kind.slice(0, -1)}-${Date.now().toString(36)}-${randomBytes(3).toString('hex')}${ext}`;
    const key = `${kind}/${filename}`;

    const bytes = new Uint8Array(buffer);

    await this.prisma.storedFile.upsert({
      where: { key },
      create: {
        key,
        mimeType: file.mimetype,
        size: buffer.length,
        data: bytes,
      },
      update: {
        mimeType: file.mimetype,
        size: buffer.length,
        data: bytes,
      },
    });

    await this.writeDiskCache(key, buffer);

    return {
      path: `/uploads/${key}`,
      filename,
      mimeType: file.mimetype,
      size: buffer.length,
    };
  }

  async remove(publicPath: string) {
    const key = this.keyFromPublicPath(publicPath);
    if (!key) return;
    await this.prisma.storedFile.deleteMany({ where: { key } });
    await this.removeDisk(key);
  }

  async resolve(
    key: string,
  ): Promise<{ data: Buffer; mimeType: string } | null> {
    if (!KEY_PATTERN.test(key)) return null;

    const abs = join(this.rootDir(), key);
    if (existsSync(abs)) {
      try {
        const data = await readFile(abs);
        return { data, mimeType: this.mimeFromKey(key) };
      } catch {
        /* fall through to the database copy */
      }
    }

    const row = await this.prisma.storedFile.findUnique({ where: { key } });
    if (!row) return null;

    const data = Buffer.from(row.data);
    await this.writeDiskCache(key, data);
    return { data, mimeType: row.mimeType };
  }

  middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        next();
        return;
      }
      if (!req.path.startsWith('/uploads/')) {
        next();
        return;
      }

      const key = (() => {
        try {
          return decodeURIComponent(req.path.slice('/uploads/'.length));
        } catch {
          res.status(400).end();
          return null;
        }
      })();
      if (!key) return;

      void this.serve(key, req, res, next);
    };
  }

  private async serve(
    key: string,
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const file = await this.resolve(key);
      if (!file) {
        res.status(404).end();
        return;
      }
      res.setHeader('Content-Type', file.mimeType);
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      res.setHeader('Content-Length', String(file.data.length));
      if (req.method === 'HEAD') {
        res.end();
        return;
      }
      res.end(file.data);
    } catch (error) {
      next(error);
    }
  }

  keyFromPublicPath(publicPath: string) {
    if (!publicPath.startsWith('/uploads/')) return null;
    const key = publicPath.slice('/uploads/'.length);
    return KEY_PATTERN.test(key) ? key : null;
  }

  private async toBuffer(file: {
    buffer?: Buffer;
    path?: string;
  }): Promise<Buffer> {
    if (file.buffer?.length) return file.buffer;
    if (file.path && existsSync(file.path)) {
      return readFile(file.path);
    }
    throw new BadRequestException('فایل تصویر ارسال نشده است.');
  }

  private async writeDiskCache(key: string, data: Buffer) {
    const abs = join(this.rootDir(), key);
    try {
      await mkdir(dirname(abs), { recursive: true });
      await writeFile(abs, data);
    } catch (error) {
      this.logger.warn(
        `Could not write upload cache ${abs}: ${error instanceof Error ? error.message : error}`,
      );
    }
  }

  private async removeDisk(key: string) {
    const abs = join(this.rootDir(), key);
    try {
      await unlink(abs);
    } catch {
      /* already gone */
    }
  }

  private mimeFromKey(key: string) {
    const ext = key.slice(key.lastIndexOf('.')).toLowerCase();
    const match = Object.entries(IMAGE_MIME_EXT).find(([, value]) => value === ext);
    return match?.[0] ?? 'application/octet-stream';
  }
}
