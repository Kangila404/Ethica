import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { BaseEntity } from 'src/common/Base.entity';
@Entity('notice')
export class Notice extends BaseEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' }) id!: string;
  @Column({ type: 'bigint', nullable: true }) authorId!: string | null;
  @Column({ type: 'varchar', length: 200 }) title!: string;
  @Column({ type: 'text' }) content!: string;
  @Column({ type: 'boolean', default: false }) isPublished!: boolean;
}
