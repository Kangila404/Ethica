import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { AuthIdentity } from "src/auth/domain/model/auth-identity.entity";
import { AuthRepository } from "src/auth/domain/repository/auth.repository";
import { Repository } from "typeorm";

@Injectable()
export class AuthRepositoryImpl implements AuthRepository {

    constructor(
        @InjectRepository(AuthIdentity)
        private readonly ormRepository: Repository<AuthIdentity> 
    ){}

    findByEmail(email: string): Promise<AuthIdentity | null> {
        return this.ormRepository.findOneBy({email});
    }

    async save(identity:AuthIdentity):Promise<void>{
        await this.ormRepository.save(identity);
    }
}