import { IStudyScheduleRepository } from '../ports/IStudyScheduleRepository.js';
import { StudySchedule, StudyScheduleItem } from '../entities/StudySchedule.js';

export interface GenerateExamSprintInput {
  studentId: string;
  subject: string;
  examDate: Date;
  topics?: string[];
  entireSubject?: boolean;
  intensity?: 'intensivo' | 'revisao' | 'do_zero';
}

export interface GenerateExamSprintOutput {
  scheduleId: string;
  sprintItemsCount: number;
  message: string;
}

export class GenerateExamSprintUseCase {
  constructor(private readonly scheduleRepository: IStudyScheduleRepository) {}

  public async execute(input: GenerateExamSprintInput): Promise<GenerateExamSprintOutput> {
    if (!input.studentId) {
      throw new Error('studentId é obrigatório para gerar sprint de prova');
    }
    if (!input.subject) {
      throw new Error('Disciplina (subject) é obrigatória');
    }

    const examDate = new Date(input.examDate);
    const now = new Date();
    const daysUntilExam = Math.max(1, Math.ceil((examDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

    let schedule = await this.scheduleRepository.findByStudentId(input.studentId);
    if (!schedule) {
      schedule = StudySchedule.create({
        studentId: input.studentId,
        title: `Sprint para Prova - ${input.subject}`,
        targetExamDate: examDate,
      });
    }

    const topicsToCover = input.entireSubject || !input.topics || input.topics.length === 0
      ? [
          `Revisão Geral de ${input.subject}`,
          `Resolução de Exercícios Principais - ${input.subject}`,
          `Simulado e Auto-Avaliação - ${input.subject}`,
        ]
      : input.topics;

    const sprintItems: StudyScheduleItem[] = [];
    const intensityMins = input.intensity === 'intensivo' ? 60 : input.intensity === 'do_zero' ? 90 : 30;

    topicsToCover.forEach((topic, idx) => {
      const offsetDays = Math.min(daysUntilExam - 1, Math.floor((idx * daysUntilExam) / topicsToCover.length));
      const scheduledDate = new Date(now);
      scheduledDate.setDate(scheduledDate.getDate() + offsetDays);

      sprintItems.push({
        id: `sprint-${Date.now()}-${idx}`,
        date: scheduledDate,
        dailyTargetMinutes: intensityMins,
        subject: input.subject,
        topic: `[Sprint Prova] ${topic}`,
        materialIds: [],
        flashcardIds: [],
        quizIds: [],
        completed: false,
      });
    });

    schedule.setItems([...sprintItems, ...schedule.items]);
    await this.scheduleRepository.save(schedule);

    return {
      scheduleId: schedule.id,
      sprintItemsCount: sprintItems.length,
      message: `Sprint de ${sprintItems.length} sessões gerado com sucesso até ${examDate.toLocaleDateString('pt-BR')}!`,
    };
  }
}
