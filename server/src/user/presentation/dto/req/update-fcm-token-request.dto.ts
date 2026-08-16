import { IsNotEmpty, IsString } from "class-validator";

export class UpdateFcmTokenRequest {
    @IsString()
    @IsNotEmpty()
    fcmToken!:string;
}