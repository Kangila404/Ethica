import { Module } from '@nestjs/common';
import { LearningProfileCategory } from './domain/model/learning-profile-category.entity';
import { PostLike } from './domain/model/post-like.entity';
import { PostLikeService } from './application/post-like.service';
import { PostLikeController } from './presentation/controller/post-like.controller';
import { POST_LIKE_REPOSITORY } from './domain/repository/post-like.repository';
import { PostLikeRepositoryImpl } from './infrastructure/persistence/repository/post-like.repository.impl';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Philosopher } from './domain/model/philosopher.entity';
import { UserPhilosopherCount } from './domain/model/user-philosopher-count.entity';
import { PHILOSOPHER_REPOSITORY } from './domain/repository/philosopher.repository';
import { USER_PHILOSOPHER_COUNT_REPOSITORY } from './domain/repository/user-philosopher-count.repository';
import { PhilosopherRepositoryImpl } from './infrastructure/persistence/repository/philosopher.repository.impl';
import { UserPhilosopherCountRepositoryImpl } from './infrastructure/persistence/repository/user-philosopher-count.repository.impl';
import { PhilosopherController } from './presentation/controller/philosopher.controller';
import { CourceController } from './presentation/controller/course.controller';
import { PhilosopherService } from './application/philosopher.service';
import { UserModule } from 'src/user/user.module';
import { Post } from './domain/model/post.entity';
import { PostSegment } from './domain/model/post-segment.entity';
import { POST_REPOSITORY } from './domain/repository/post.repository';
import { PostRepositoryImpl } from './infrastructure/persistence/repository/post.repository.impl';
import { POST_SEGMENT_REPOSITORY } from './domain/repository/post-segment.repository';
import { PostSegmentRepositoryImpl } from './infrastructure/persistence/repository/post-segment.repository.impl';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Philosopher,
      UserPhilosopherCount,
      Post,
      PostSegment,
      LearningProfileCategory,
      PostLike,
    ]),
    UserModule,
  ],
  controllers: [PhilosopherController, CourceController, PostLikeController],
  providers: [
    PhilosopherService,
    PostLikeService,
    { provide: POST_LIKE_REPOSITORY, useClass: PostLikeRepositoryImpl },
    {
      provide: PHILOSOPHER_REPOSITORY,
      useClass: PhilosopherRepositoryImpl,
    },
    {
      provide: USER_PHILOSOPHER_COUNT_REPOSITORY,
      useClass: UserPhilosopherCountRepositoryImpl,
    },
    {
      provide: POST_REPOSITORY,
      useClass: PostRepositoryImpl,
    },
    {
      provide: POST_SEGMENT_REPOSITORY,
      useClass: PostSegmentRepositoryImpl,
    },
  ],
  exports: [PHILOSOPHER_REPOSITORY, USER_PHILOSOPHER_COUNT_REPOSITORY],
})
export class PhilosopherModule {}
