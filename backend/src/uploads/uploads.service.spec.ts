import { mkdir, mkdtemp, readFile, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { ConfigService } from '@nestjs/config';
import { UploadsService } from './uploads.service';

function mockPrisma(store: Map<string, { key: string; mimeType: string; size: number; data: Buffer }>) {
  return {
    storedFile: {
      upsert: jest.fn(
        async ({
          where,
          create,
        }: {
          where: { key: string };
          create: { key: string; mimeType: string; size: number; data: Buffer };
        }) => {
          store.set(where.key, create);
          return create;
        },
      ),
      findUnique: jest.fn(async ({ where }: { where: { key: string } }) => {
        const row = store.get(where.key);
        return row ?? null;
      }),
      deleteMany: jest.fn(async ({ where }: { where: { key: string } }) => {
        const existed = store.delete(where.key);
        return { count: existed ? 1 : 0 };
      }),
    },
  };
}

describe('UploadsService', () => {
  let root: string;
  let store: Map<string, { key: string; mimeType: string; size: number; data: Buffer }>;
  let service: UploadsService;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'etude-uploads-'));
    store = new Map();
    service = new UploadsService(
      mockPrisma(store) as never,
      { get: (key: string) => (key === 'uploadDir' ? root : undefined) } as ConfigService,
    );
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('persists the file in the database and on disk', async () => {
    const buffer = Buffer.from([0xff, 0xd8, 0xff, 0xd9]);
    const saved = await service.save('attachments', {
      buffer,
      mimetype: 'image/jpeg',
      size: buffer.length,
      originalname: 'optimized.jpg-150641_20260816',
    });

    expect(saved.path.startsWith('/uploads/attachments/')).toBe(true);
    expect(saved.filename.endsWith('.jpg')).toBe(true);
    expect(saved.key.startsWith('attachments/')).toBe(true);
    expect(store.size).toBe(1);

    const key = service.keyFromPublicPath(saved.path);
    expect(key).toBeTruthy();
    const onDisk = await readFile(join(root, key!));
    expect(onDisk.equals(buffer)).toBe(true);
  });

  it('serves from the database when the disk cache is gone', async () => {
    const buffer = Buffer.from('png-bytes');
    const saved = await service.save('attachments', {
      buffer,
      mimetype: 'image/png',
      size: buffer.length,
    });
    const key = service.keyFromPublicPath(saved.path)!;
    await rm(join(root, key), { force: true });

    const resolved = await service.resolve(key);
    expect(resolved?.mimeType).toBe('image/png');
    expect(resolved?.data.equals(buffer)).toBe(true);

    const restored = await readFile(join(root, key));
    expect(restored.equals(buffer)).toBe(true);
  });

  it('falls back to leftover disk files that were never stored in the database', async () => {
    const key = 'attachments/legacy.png';
    await mkdir(join(root, 'attachments'), { recursive: true });
    await writeFile(join(root, key), Buffer.from('legacy'));

    const resolved = await service.resolve(key);
    expect(resolved?.data.toString()).toBe('legacy');
    expect(resolved?.mimeType).toBe('image/png');
  });

  it('rejects path traversal keys', async () => {
    expect(await service.resolve('../secret.png')).toBeNull();
    expect(await service.resolve('attachments/../../etc/passwd')).toBeNull();
    expect(service.keyFromPublicPath('/uploads/attachments/../../x')).toBeNull();
  });

  it('stores exam images as public media', async () => {
    const buffer = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
    const saved = await service.save('exams', {
      buffer,
      mimetype: 'image/png',
      size: buffer.length,
    });
    expect(saved.path.startsWith('/uploads/exams/')).toBe(true);
    const key = service.keyFromPublicPath(saved.path);
    expect(key).toBeTruthy();
    const resolved = await service.resolve(key!);
    expect(resolved?.data.equals(buffer)).toBe(true);
  });

  it('keeps student PDFs private from the public resolver', async () => {
    const buffer = Buffer.from('%PDF-1.4 minimal');
    const saved = await service.savePdf({
      buffer,
      mimetype: 'application/pdf',
      size: buffer.length,
      originalname: 'answers.pdf',
    });
    expect(saved.key.startsWith('exam-submissions/')).toBe(true);
    expect(await service.resolve(saved.key)).toBeNull();
    const privateFile = await service.resolvePrivate(saved.key);
    expect(privateFile?.mimeType).toBe('application/pdf');
    expect(privateFile?.data.equals(buffer)).toBe(true);
  });

  it('rejects forged PDFs that are not actually PDF bytes', async () => {
    await expect(
      service.savePdf({
        buffer: Buffer.from('not-a-pdf'),
        mimetype: 'application/pdf',
        size: 9,
        originalname: 'answers.pdf',
      }),
    ).rejects.toThrow('فایل PDF نامعتبر است.');
  });
});
