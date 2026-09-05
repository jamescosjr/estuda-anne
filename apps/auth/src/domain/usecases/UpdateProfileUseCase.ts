import { User, ExamDateItem } from '../entities/User.js';
import { IUserRepository } from '../ports/IUserRepository.js';
import { TokenPayload } from '../ports/ITokenProvider.js';

export interface UpdateProfileDTO {
  executor: TokenPayload;
  name?: string;
  course?: string;
  period?: string;
  periodStartDate?: string;
  periodEndDate?: string;
  examDates?: ExamDateItem[];
  subjects?: string[];
  studyGoalMinutes?: number;
}

export class UpdateProfileUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  public async execute(dto: UpdateProfileDTO): Promise<User> {
    const userId = dto.executor?.userId || dto.executor?.sub;
    if (!dto.executor || !userId) {
      throw new Error('Acesso negado: token inválido');
    }

    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    user.updateProfile({
      name: dto.name,
      course: dto.course,
      period: dto.period,
      periodStartDate: dto.periodStartDate,
      periodEndDate: dto.periodEndDate,
      examDates: dto.examDates,
      subjects: dto.subjects,
      studyGoalMinutes: dto.studyGoalMinutes,
    });

    await this.userRepository.update(user);
    return user;
  }
}
