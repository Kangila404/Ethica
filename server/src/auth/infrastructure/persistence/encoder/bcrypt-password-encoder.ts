import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PasswordEncoder } from '../../../domain/encoder/password-encoder';

@Injectable()
export class BcryptPasswordEncoder implements PasswordEncoder {
  private readonly saltRounds = 10;

  encode(plain: string): Promise<string> {
    return bcrypt.hash(plain, this.saltRounds);
  }

  matches(plain: string, hashed: string): Promise<boolean> {
    return bcrypt.compare(plain, hashed);
  }
}
