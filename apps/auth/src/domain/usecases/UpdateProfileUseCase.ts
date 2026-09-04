import { User } from '../entities/User.js';
import { IUserRepository } from '../ports/IUserRepository.js';
import { TokenPayload } from '../ports/ITokenProvider.js';

export interface UpdateProfileDTO {
  executor: TokenPayload;
  name?: string;
  course?: string;
  period?: string;
  subjects?: string[];
  studyGoalMinutes?: number;
}

export class UpdateProfileUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  public async execute(dto: UpdateProfileDTO): Promise<User> {
    if (!dto.executor || !dto.executor.sub) {
      throw new Error('Acesso negado: token inválido');
    }

    const user = await this.userRepository.findById(dto.executor.sub);
    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    user.updateProfile({
      name: dto.name,
      course: dto.course,
      period: dto.period,
      subjects: dto.subjects,
      studyGoalMinutes: dto.studyGoalMinutes,
    });

    await this.userRepository.update(user);
    return user;
  }
}
