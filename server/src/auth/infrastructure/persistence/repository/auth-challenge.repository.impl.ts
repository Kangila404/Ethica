import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, MoreThan, Repository } from 'typeorm';
import { AuthChallenge } from '../../../domain/model/auth-challenge.entity';
import { AuthChallengeRepository } from '../../../domain/repository/auth-challenge.repository';

@Injectable()
export class AuthChallengeRepositoryImpl implements AuthChallengeRepository {
  constructor(
    @InjectRepository(AuthChallenge)
    private readonly repository: Repository<AuthChallenge>,
  ) {}
  async save(challenge: AuthChallenge): Promise<void> {
    await this.repository.delete({ expiresAt: LessThanOrEqual(new Date()) });
    await this.repository.save(challenge);
  }
  findValid(id: string): Promise<AuthChallenge | null> {
    return this.repository.findOneBy({ id, expiresAt: MoreThan(new Date()) });
  }
  async consume(id: string): Promise<boolean> {
    const result = await this.repository.delete({
      id,
      expiresAt: MoreThan(new Date()),
    });
    return result.affected === 1;
  }
}
