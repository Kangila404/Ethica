import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { BaseEntity } from 'src/common/Base.entity';
@Entity('term')
export class Term extends BaseEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' }) id!: string;
  @Column({ type: 'varchar', length: 16, unique: true }) type!: string;
  @Column({ type: 'varchar', length: 200 }) title!: string;
  @Column({ type: 'text' }) content!: string;
  @Column({ type: 'varchar', length: 50 }) version!: string;
}
