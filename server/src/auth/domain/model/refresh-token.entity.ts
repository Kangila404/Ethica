import { BaseEntity, Column, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

@Entity('refresh_tokens')
export class RefreshToken extends BaseEntity {

    @PrimaryGeneratedColumn({type:'bigint'})
    id!:string;

    @Index()
    @Column({type: 'bigint'})
    userId!:string;

    @Column({type: 'char', length: 64, unique: true})
    tokenHash!:string;

    @Column({type: 'datetime'})
    expiredAt!:Date;

    // 비즈니스 로직
    static issue(userId: string, tokenHash: string, expiredAt: Date): RefreshToken {
        const token = new RefreshToken();
        token.userId = userId;
        token.tokenHash = tokenHash;
        token.expiredAt = expiredAt;
        return token;
    }
}