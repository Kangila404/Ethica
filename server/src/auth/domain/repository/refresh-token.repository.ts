import { RefreshToken } from "../model/refresh-token.entity"


export const REFRESHTOKEN_REPOSITORY = Symbol('REFRESHTOKEN_REPOSITORY')

export interface RefreshTokenRepository {

    save(token: RefreshToken): Promise<void>;

    findByTokenHash(tokenHash: string): Promise<RefreshToken | null>;

    deleteByTokenHash(tokenHash: string): Promise<void>;
}