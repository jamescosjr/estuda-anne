import { User } from '../entities/User.js';
import { IUserRepository } from '../ports/IUserRepository.js';
import { IPasswordHasher } from '../ports/IPasswordHasher.js';
import { TokenPayload } from '../ports/ITokenProvider.js';

export interface CreateStudentDTO {
  executor: TokenPayload;
  name: string;
  email: string;
  passwordText: string;
}

export class CreateStudentUserUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly passwordHasher: IPasswordHasher
  ) {}

  public async execute(dto: CreateStudentDTO): Promise<User> {
    if (!dto.executor || dto.executor.role !== 'ADMIN') {
      throw new Error('Acesso negado: apenas o usuário Admin pode criar novos estudantes');
    }

    const existingUser = await this.userRepository.findByEmail(dto.email);
    if (existingUser) {
      throw new Error('E-mail já cadastrado na plataforma');
    }

    const passwordHash = await this.passwordHasher.hash(dto.passwordText);

    const student = new User({
      name: dto.name,
      email: dto.email,
      passwordHash,
      role: 'STUDENT',
    });

    await this.userRepository.save(student);
    return student;
  }
}
