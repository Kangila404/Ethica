import { Injectable, Inject } from '@nestjs/common';
import { USER_REPOSITORY } from '../domain/repository/user.repository';
import type { UserRepository } from '../domain/repository/user.repository';

@Injectable()
export class UserService {
    constructor(
        @Inject(USER_REPOSITORY)
        private readonly userRepository: UserRepository,
    ) {}
}