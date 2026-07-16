import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { RefreshToken } from 'src/auth/domain/model/refresh-token.entity';
import { RefreshTokenRepository } from 'src/auth/domain/repository/refresh-token.repository';
import { Repository } from 'typeorm';

@Injectable()
export class RefreshTokenRepositoryImpl implements RefreshTokenRepository {
  constructor(
    @InjectRepository(RefreshToken)
    private readonly ormRepository: Repository<RefreshToken>,
  ) {}

  async save(token: RefreshToken): Promise<void> {
    await this.ormRepository.save(token);
  }

  async findByTokenHash(tokenHash: string): Promise<RefreshToken | null> {
    return await this.ormRepository.findOne({ where: { tokenHash } });
  }

  async deleteByTokenHash(tokenHash: string): Promise<number> {
    const result = await this.ormRepository.delete({ tokenHash });
    return result.affected ?? 0;
  }
}
