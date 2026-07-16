import { Entity, PrimaryGeneratedColumn, Column, BaseEntity } from 'typeorm';


@Entity('philosopher')
export class Philosopher extends BaseEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Column({ type: 'varchar', length: 50 })
  name!: string;

  @Column({ type: 'varchar', length: 50 })
  era!: string;

  @Column({ type: 'varchar', length: 50 })
  school!: string;

  @Column({ type: 'text' })
  coreThought!: string;

  @Column({ type: 'text' })
  lifeRoots!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  imageKey!: string | null;
}