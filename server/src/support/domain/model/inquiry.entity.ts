import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { BaseEntity } from 'src/common/Base.entity';
@Entity('inquiry')
export class Inquiry extends BaseEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' }) id!: string;
  @Column({ type: 'bigint' }) userId!: string;
  @Column({ type: 'varchar', length: 200 }) title!: string;
  @Column({ type: 'text' }) content!: string;
  @Column({ type: 'varchar', length: 16, default: 'pending' }) status!: string;
  @Column({ type: 'text', nullable: true }) answerContent!: string | null;
  @Column({ type: 'bigint', nullable: true }) answeredBy!: string | null;
  @Column({ type: 'datetime', nullable: true }) answeredAt!: Date | null;
}
