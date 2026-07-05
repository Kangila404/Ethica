import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { User } from "src/user/domain/model/user.entity";
import { OnboardingController } from "./presentation/controller/onboarding.controller";
import { OnboardingService } from "./application/onboarding.service";
import { USER_REPOSITORY } from "src/user/domain/repository/user.repository";
import { UserRepositoryImpl } from "src/user/infrastructure/persistence/user.repository.impl";

@Module({
    imports: [TypeOrmModule.forFeature([User])],
    controllers: [OnboardingController],
    providers: [
        OnboardingService,
        {provide: USER_REPOSITORY, useClass: UserRepositoryImpl}
    ]
})

export class OnboardingModule {}