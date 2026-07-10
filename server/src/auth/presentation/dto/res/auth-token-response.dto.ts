import { ApiProperty } from "@nestjs/swagger";
import { OnboardingStatus } from "src/user/domain/enum/OnboardingStatus.enum";
import { User } from "src/user/domain/model/user.entity";

export class AuthTokenResponse {
    @ApiProperty({ example: 'eyJhbGc...', description: 'Access Token' })
    accessToken!: string;

    @ApiProperty({ example: 'eyJhbGc...', description: 'Refresh Token' })
    refreshToken!: string;

    @ApiProperty({
        example: {
            userId: '11111111-1111-1111-1111-111111111111',
            name: '유저',
            onboardingStatus: 'incomplete',
        },
        description: '유저 정보',
    })
    user!: {
        userId: string;
        name: string;
        onboardingStatus: OnboardingStatus;
    };

    static of(accessToken: string, refreshToken: string, user: User): AuthTokenResponse {
        const res = new AuthTokenResponse();
        res.accessToken = accessToken;
        res.refreshToken = refreshToken;
        res.user = {
            userId: user.userId,
            name: user.name,
            onboardingStatus: user.onboardingStatus,
        };
        return res;
    }
}