import { User } from '../entities/User.js';
import { IUserRepository } from '../ports/IUserRepository.js';
import { IPasswordHasher } from '../ports/IPasswordHasher.js';
import { TokenPayload } from '../ports/ITokenProvider.js';

export interface UpdateStudentDTO {
  executor: TokenPayload;
  studentId: string;
  name?: string;
  email?: string;
  passwordText?: string;
}

export class UpdateStudentUserUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly passwordHasher: IPasswordHasher
  ) {}

  public async execute(dto: UpdateStudentDTO): Promise<User> {
    if (!dto.executor || dto.executor.role !== 'ADMIN') {
      throw new Error('Acesso negado: apenas o usuário Admin pode atualizar estudantes');
    }

    const student = await this.userRepository.findById(dto.studentId);
    if (!student) {
      throw new Error('Estudante não encontrado');
    }

    if (dto.email && dto.email.toLowerCase() !== student.email) {
      const emailConflict = await this.userRepository.findByEmail(dto.email);
      if (emailConflict) {
        throw new Error('E-mail em uso por outro usuário');
      }
    }

    student.updateDetails(dto.name, dto.email);

    if (dto.passwordText && dto.passwordText.trim().length > 0) {
      const newHash = await this.passwordHasher.hash(dto.passwordText.trim());
      student.updatePassword(newHash);
    }

    await this.userRepository.update(student);
    return student;
  }
}
