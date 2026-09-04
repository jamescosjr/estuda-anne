import { User } from '../entities/User.js';
import { IUserRepository } from '../ports/IUserRepository.js';
import { IPasswordHasher } from '../ports/IPasswordHasher.js';

export interface SeedAdminDTO {
  adminEmail: string;
  adminPasswordText: string;
  adminName?: string;
}

export class SeedAdminUserUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly passwordHasher: IPasswordHasher
  ) {}

  public async execute(dto: SeedAdminDTO): Promise<User> {
    const existingAdmin = await this.userRepository.findByEmail(dto.adminEmail);
    if (existingAdmin) {
      return existingAdmin;
    }

    const passwordHash = await this.passwordHasher.hash(dto.adminPasswordText);

    const admin = new User({
      id: 'usr-admin-master',
      name: dto.adminName || 'James (Admin Master)',
      email: dto.adminEmail,
      passwordHash,
      role: 'ADMIN',
    });

    await this.userRepository.save(admin);
    return admin;
  }
}
