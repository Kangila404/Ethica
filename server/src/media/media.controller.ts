import {
  Controller,
  Get,
  Param,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
  ApiTags,
  ApiCreatedResponse,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/infrastructure/security/jwt-auth.guard';
import { AdminGuard } from '../admin/presentation/admin.guard';
import { MAX_IMAGE_BYTES, MediaService } from './media.service';

@ApiTags('Media')
@Controller('/api')
export class MediaController {
  constructor(private readonly media: MediaService) {}
  @Get('media/:key')
  async get(@Param('key') key: string, @Res() response: Response) {
    const path = await this.media.file(key);
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Cache-Control', 'public, max-age=86400');
    response.sendFile(path);
  }
  @Post('admin/media')
  @ApiCreatedResponse({
    schema: {
      type: 'object',
      required: ['imageKey'],
      properties: { imageKey: { type: 'string', example: 'sha256.png' } },
    },
  })
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
      required: ['file'],
    },
  })
  @UseGuards(JwtAuthGuard, AdminGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_IMAGE_BYTES, files: 1 },
    }),
  )
  async upload(@UploadedFile() file?: { buffer: Buffer }) {
    if (!file?.buffer) throw new BadRequestException('이미지를 선택해주세요.');
    return this.media.upload(file.buffer);
  }
}
