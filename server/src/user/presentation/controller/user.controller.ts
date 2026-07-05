import { Body, Controller, Delete, Get, Patch, Query } from '@nestjs/common';
import {UserService} from '../../application/user.service';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserResponse } from '../dto/res/user-response.dto';
import { NicknameUpdateRequest } from '../dto/req/nicknameUpdate-request.dto';
import { MessageResponse } from 'src/common/dto/res/message-response.dto';
import { DailyTimeRequest } from '../dto/req/dailyTime-request.dto';
import { NotificationRequest } from '../dto/req/notification-request.dto';
import { NotificationResponse } from '../dto/res/notification-response.dto';

@ApiTags('USER API')
@Controller('/api/users')
export class UserController {
    constructor(private readonly userService: UserService){}


    @Get('/me')
    @ApiOperation({ summary: '내 정보 조회'})
    getMe(@Query('userId') userId: string): Promise<UserResponse>{
        return this.userService.getMe(userId);
    }


    @Patch("/me")
    @ApiOperation({summary: '닉네임 수정'})
    updateNickname(
        @Query('userId') userId: string,
        @Body() request: NicknameUpdateRequest,
    ): Promise<MessageResponse>{
        return this.userService.updateNickname(userId, request);
    }

    @Patch("/me/daily-time")
    @ApiOperation({summary: '위젯 시간 변경'})
    updateDailyTime(
        @Query('userId') userId: string,
        @Body() request: DailyTimeRequest,
):Promise<MessageResponse>{
    return this.userService.updateDailyTime(userId, request);
    }


    @Patch('/me/notification')
    @ApiOperation({summary: '위젯 보내기 변경'})
    updateNotification(
        @Query('userId') userId:string,
        @Body() request: NotificationRequest,
    ):Promise<NotificationResponse>{
        return this.userService.updateNotification(userId, request);
    }


}
