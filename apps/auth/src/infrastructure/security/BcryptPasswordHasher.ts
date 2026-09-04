import bcrypt from 'bcryptjs';
import { IPasswordHasher } from '../../domain/ports/IPasswordHasher.js';

export class BcryptPasswordHasher implements IPasswordHasher {
  private readonly rounds = 10;

  public async hash(plainText: string): Promise<string> {
    return bcrypt.hash(plainText, this.rounds);
  }

  public async compare(plainText: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plainText, hash);
  }
}
