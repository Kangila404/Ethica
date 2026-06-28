import { Entity, PrimaryGeneratedColumn, Column, Generated, DeleteDateColumn } from "typeorm";
import {BaseEntity} from '../../../common/Base.entity';
import { UserRole } from "../enum/user-role.enum";
import { UserStatus } from "../enum/user-status.enum";
import { OnboardingStatus } from "../enum/OnboardingStatus.enum";

@Entity('users')
export class User extends BaseEntity {
    @PrimaryGeneratedColumn({type: 'bigint'})
    id!: string;

    @Column({type: 'char', length: 36, unique: true})
    @Generated('uuid')
    userId!: string;

    @Column({type: 'varchar', length: 10})
    name!: string;

    @Column({type: 'enum', enum: UserRole, default: UserRole.USER})
    userRole!: UserRole;


    @Column({ type: 'enum', enum: UserStatus, default: UserStatus.ACTIVE })
    userStatus!: UserStatus;

    @Column({ type: 'enum', enum: OnboardingStatus, default: OnboardingStatus.INCOMPLETE })
    onboardingStatus!: OnboardingStatus;

    @Column({type: 'boolean', default: true})
    notificationEnabled!: boolean;


    @Column({type: 'bigint', nullable:true})
    interestCategoryId!: string | null;

    @Column({ type: 'time' })
    dailyQuestionTime!: string;

    @Column({ type: 'varchar', length: 50 })
    timezone!: string;

    @Column({type: 'datetime', nullable: true})
    lastLoginAt!:Date | null;

    @DeleteDateColumn({ nullable: true })
    deletedAt!: Date | null;

    

}