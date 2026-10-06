import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/infrastructure/security/jwt-auth.guard';
import { CurrentUserId } from 'src/auth/infrastructure/security/current-user.decorator';
import { PushDeviceService } from '../../application/push-device.service';
import { RegisterPushDeviceRequest } from '../dto/req/register-push-device-request.dto';

@ApiTags('USER API')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('/api/users/me/push-devices')
export class PushDeviceController {
  constructor(private readonly devices: PushDeviceService) {}
  @Put(':installationId')
  @ApiOperation({
    summary: '현재 기기 알림 등록·토큰 회전·수신 설정 (기존 iOS API와 병행)',
  })
  register(
    @CurrentUserId() userId: string,
    @Param('installationId', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() input: RegisterPushDeviceRequest,
  ) {
    return this.devices.register(userId, id, input);
  }
  @Get(':installationId')
  @ApiOperation({
    summary: '현재 계정의 해당 기기 알림 설정 조회 (토큰 반환 없음)',
  })
  get(
    @CurrentUserId() userId: string,
    @Param('installationId', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.devices.get(userId, id);
  }
  @Delete(':installationId')
  @HttpCode(204)
  @ApiOperation({
    summary: '현재 계정의 해당 기기만 해제. 다른 기기의 설정은 유지',
  })
  remove(
    @CurrentUserId() userId: string,
    @Param('installationId', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.devices.remove(userId, id);
  }
}
