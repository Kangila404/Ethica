import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';
import { access, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
export function imageExtension(data: Buffer): 'png' | 'jpg' | 'webp' {
  if (
    data.length >= 24 &&
    data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  )
    return 'png';
  if (data.length >= 4 && data[0] === 255 && data[1] === 216 && data[2] === 255)
    return 'jpg';
  if (
    data.length >= 16 &&
    data.toString('ascii', 0, 4) === 'RIFF' &&
    data.toString('ascii', 8, 12) === 'WEBP'
  )
    return 'webp';
  throw new BadRequestException('PNG, JPEG, WebP 이미지를 선택해주세요.');
}

@Injectable()
export class MediaService {
  private readonly uploads: string;
  private readonly bundled: string;
  constructor(config: ConfigService) {
    this.bundled = resolve(
      config.get<string>('MEDIA_CONTENT_DIRECTORY') || 'content-media',
    );
    this.uploads = resolve(
      config.get<string>('MEDIA_UPLOAD_DIRECTORY') || 'media-uploads',
    );
  }
  async upload(data: Buffer) {
    if (!data?.length || data.length > MAX_IMAGE_BYTES)
      throw new BadRequestException('이미지는 8MB 이하로 올려주세요.');
    const ext = imageExtension(data);
    const imageKey = `${createHash('sha256').update(data).digest('hex')}.${ext}`;
    await mkdir(this.uploads, { recursive: true });
    try {
      await writeFile(resolve(this.uploads, imageKey), data, { flag: 'wx' });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
    }
    return { imageKey };
  }
  async file(key: string): Promise<string> {
    if (!/^[a-z0-9][a-z0-9-]{0,100}\.(png|jpg|webp)$/.test(key))
      throw new NotFoundException();
    for (const folder of [this.bundled, this.uploads]) {
      const path = resolve(folder, key);
      try {
        await access(path);
        return path;
      } catch {
        /* Try the other image directory. */
      }
    }
    throw new NotFoundException('이미지를 찾을 수 없습니다.');
  }
}
