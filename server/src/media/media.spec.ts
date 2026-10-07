import {
  INestApplication,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Server } from 'node:http';
import request from 'supertest';
import { MediaModule } from './media.module';
import { MAX_IMAGE_BYTES, MediaService } from './media.service';
import { JwtAuthGuard } from '../auth/infrastructure/security/jwt-auth.guard';

const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=',
  'base64',
);
describe('persistent media', () => {
  let app: INestApplication;
  let folder: string;
  let media: MediaService;
  beforeAll(async () => {
    folder = await mkdtemp(join(tmpdir(), 'ethica-media-'));
    const module = await Test.createTestingModule({ imports: [MediaModule] })
      .overrideProvider(ConfigService)
      .useValue({ get: () => folder })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate(context: ExecutionContext) {
          const req = context.switchToHttp().getRequest<{
            headers: Record<string, string>;
            user?: { role: string };
          }>();
          const role = req.headers['x-fixture-role'];
          if (!role) throw new UnauthorizedException();
          req.user = { role };
          return true;
        },
      })
      .compile();
    app = module.createNestApplication();
    await app.init();
    media = app.get(MediaService);
  });
  afterAll(async () => {
    await app?.close();
    await rm(folder, { recursive: true, force: true });
  });
  it('requires a signed-in administrator', async () => {
    await request(app.getHttpServer() as Server)
      .post('/api/admin/media')
      .attach('file', png, 'cover.png')
      .expect(401);
    await request(app.getHttpServer() as Server)
      .post('/api/admin/media')
      .set('x-fixture-role', 'user')
      .attach('file', png, 'cover.png')
      .expect(403);
  });
  it('ignores supplied paths, stores once by content hash, and serves the bytes', async () => {
    const upload = await request(app.getHttpServer() as Server)
      .post('/api/admin/media')
      .set('x-fixture-role', 'admin')
      .attach('file', png, {
        filename: '../../cover.png',
        contentType: 'image/png',
      })
      .expect(201);
    const key = (upload.body as { imageKey: string }).imageKey;
    expect(key).toMatch(/^[a-f0-9]{64}\.png$/);
    expect(await media.upload(png)).toEqual({ imageKey: key });
    expect(await readFile(join(folder, key))).toEqual(png);
    const response = await request(app.getHttpServer() as Server)
      .get(`/api/media/${key}`)
      .expect(200)
      .expect('Content-Type', /image\/png/)
      .expect('X-Content-Type-Options', 'nosniff');
    expect(response.body).toEqual(png);
  });
  it('rejects non-image payloads even with an image filename', async () => {
    await request(app.getHttpServer() as Server)
      .post('/api/admin/media')
      .set('x-fixture-role', 'admin')
      .attach('file', Buffer.from('<svg onload="alert(1)"/>'), 'image.png')
      .expect(400);
    await expect(
      media.upload(Buffer.alloc(MAX_IMAGE_BYTES + 1)),
    ).rejects.toThrow();
  });
  it('rejects missing files and multipart payloads above the limit', async () => {
    await request(app.getHttpServer() as Server)
      .post('/api/admin/media')
      .set('x-fixture-role', 'admin')
      .expect(400);
    await request(app.getHttpServer() as Server)
      .post('/api/admin/media')
      .set('x-fixture-role', 'admin')
      .attach('file', Buffer.alloc(MAX_IMAGE_BYTES + 1), 'image.png')
      .expect(413);
  });
  it('does not expose paths, hidden files, or missing assets', async () => {
    for (const key of [
      '../.env',
      '%2e%2e%2f.env',
      '.env',
      '/tmp/image.png',
      'missing.png',
    ]) {
      await expect(media.file(key)).rejects.toThrow();
    }
  });
});
