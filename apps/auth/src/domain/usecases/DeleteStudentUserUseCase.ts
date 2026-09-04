import { IUserRepository } from '../ports/IUserRepository.js';
import { TokenPayload } from '../ports/ITokenProvider.js';

export interface DeleteStudentDTO {
  executor: TokenPayload;
  studentId: string;
}

export class DeleteStudentUserUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  public async execute(dto: DeleteStudentDTO): Promise<void> {
    if (!dto.executor || dto.executor.role !== 'ADMIN') {
      throw new Error('Acesso negado: apenas o usuário Admin pode remover estudantes');
    }

    const targetUser = await this.userRepository.findById(dto.studentId);
    if (!targetUser) {
      throw new Error('Estudante não encontrado');
    }

    if (targetUser.role === 'ADMIN') {
      throw new Error('Operação proibida: o usuário Admin não pode ser removido');
    }

    await this.userRepository.delete(dto.studentId);
  }
}
