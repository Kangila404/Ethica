import { BaseEntity, Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity('category')
export class Category extends BaseEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Column({ type: 'varchar', length: 50 })
  name!: string;

  @Column({ type: 'int' })
  sortOrder!: number;
}