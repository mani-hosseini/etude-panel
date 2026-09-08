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
import {
  PDF_MIME,
  PRIVATE_UPLOAD_KIND,
  assertPdfBuffer,
} from './pdf-upload';

/** Public media served from `/uploads/…`. Student PDFs are intentionally excluded. */
const PUBLIC_KEY_PATTERN =
  /^(attachments|slides|avatars|exams)\/[A-Za-z0-9._-]+$/;
const PRIVATE_KEY_PATTERN = /^exam-submissions\/[A-Za-z0-9._-]+$/;

export type StoredUpload = {
  path: string;
  key: string;
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
    const buffer = await this.toBuffer(file, 'فایل تصویر ارسال نشده است.');
    const ext = IMAGE_MIME_EXT[file.mimetype];
    if (!ext) {
      throw new BadRequestException(
        'فقط تصویرهای JPG، PNG، WEBP یا GIF مجاز هستند.',
      );
    }

    const prefix = kind === 'exams' ? 'exam' : kind.slice(0, -1);
    const filename = `${prefix}-${Date.now().toString(36)}-${randomBytes(3).toString('hex')}${ext}`;
    const key = `${kind}/${filename}`;
    await this.persist(key, file.mimetype, buffer);

    return {
      path: `/uploads/${key}`,
      key,
      filename,
      mimeType: file.mimetype,
      size: buffer.length,
    };
  }

  async savePdf(file: {
    buffer?: Buffer;
    path?: string;
    mimetype: string;
    size: number;
    originalname?: string;
  }): Promise<StoredUpload> {
    const buffer = await this.toBuffer(file, 'فایل PDF ارسال نشده است.');
    assertPdfBuffer({
      buffer,
      mimetype: file.mimetype,
      size: file.size || buffer.length,
    });

    const filename = `submission-${Date.now().toString(36)}-${randomBytes(4).toString('hex')}.pdf`;
    const key = `${PRIVATE_UPLOAD_KIND}/${filename}`;
    await this.persist(key, PDF_MIME, buffer);

    return {
      path: `/uploads/${key}`,
      key,
      filename,
      mimeType: PDF_MIME,
      size: buffer.length,
    };
  }

  async remove(publicPath: string) {
    const key = this.keyFromPublicPath(publicPath);
    if (!key) return;
    await this.removeByKey(key);
  }

  async removeByKey(key: string) {
    if (!PUBLIC_KEY_PATTERN.test(key) && !PRIVATE_KEY_PATTERN.test(key)) {
      return;
    }
    await this.prisma.storedFile.deleteMany({ where: { key } });
    await this.removeDisk(key);
  }

  async resolve(
    key: string,
  ): Promise<{ data: Buffer; mimeType: string } | null> {
    if (!PUBLIC_KEY_PATTERN.test(key)) return null;
    return this.readStored(key);
  }

  async resolvePrivate(
    key: string,
  ): Promise<{ data: Buffer; mimeType: string } | null> {
    if (!PRIVATE_KEY_PATTERN.test(key)) return null;
    return this.readStored(key);
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
    return PUBLIC_KEY_PATTERN.test(key) ? key : null;
  }

  private async persist(key: string, mimeType: string, buffer: Buffer) {
    const bytes = new Uint8Array(buffer);
    await this.prisma.storedFile.upsert({
      where: { key },
      create: {
        key,
        mimeType,
        size: buffer.length,
        data: bytes,
      },
      update: {
        mimeType,
        size: buffer.length,
        data: bytes,
      },
    });
    await this.writeDiskCache(key, buffer);
  }

  private async readStored(
    key: string,
  ): Promise<{ data: Buffer; mimeType: string } | null> {
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

  private async toBuffer(
    file: {
      buffer?: Buffer;
      path?: string;
    },
    emptyMessage: string,
  ): Promise<Buffer> {
    if (file.buffer?.length) return file.buffer;
    if (file.path && existsSync(file.path)) {
      return readFile(file.path);
    }
    throw new BadRequestException(emptyMessage);
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
    if (ext === '.pdf') return PDF_MIME;
    const match = Object.entries(IMAGE_MIME_EXT).find(
      ([, value]) => value === ext,
    );
    return match?.[0] ?? 'application/octet-stream';
  }
}
