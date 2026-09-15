import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Post } from 'src/philosopher/domain/model/post.entity';
import { PostRepository } from 'src/philosopher/domain/repository/post.repository';
import { Repository } from 'typeorm';

@Injectable()
export class PostRepositoryImpl implements PostRepository {
  constructor(
    @InjectRepository(Post)
    private readonly ormRepository: Repository<Post>,
  ) {}

  async findById(id: string): Promise<Post | null> {
    return await this.ormRepository.findOne({
      where: { id },
    });
  }

  async findByPhilosopherId(philosopherId: string): Promise<Post[]> {
    return await this.ormRepository.find({
      where: { philosopherId },
      order: {
        id: 'ASC',
      },
    });
  }

  async countByPhilosopherId(philosopherId:string): Promise<number>{
    return await this.ormRepository.count({
      where:{philosopherId},
    });
  }
}
