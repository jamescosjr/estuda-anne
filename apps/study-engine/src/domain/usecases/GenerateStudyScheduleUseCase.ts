import { StudySchedule, StudyScheduleItem } from '../entities/StudySchedule.js';
import {
  IStudyScheduleRepository,
  IMaterialRepository,
  IFlashcardRepository,
} from '../ports/index.js';

export interface GenerateStudyScheduleInput {
  studentId: string;
  title: string;
  subjects?: string[];
  targetExamDate?: Date;
  dailyStudyMinutesTarget?: number;
}

export class GenerateStudyScheduleUseCase {
  constructor(
    private readonly scheduleRepository: IStudyScheduleRepository,
    private readonly materialRepository: IMaterialRepository,
    private readonly flashcardRepository: IFlashcardRepository
  ) {}

  public async execute(input: GenerateStudyScheduleInput): Promise<StudySchedule> {
    if (!input.studentId || input.studentId.trim() === '') {
      throw new Error('studentId is required to generate study schedule');
    }
    if (!input.title || input.title.trim() === '') {
      throw new Error('title is required to generate study schedule');
    }

    const materials = await this.materialRepository.findByStudentId(input.studentId, 20);
    const flashcards = await this.flashcardRepository.findByStudentId(input.studentId);

    const schedule = StudySchedule.create({
      studentId: input.studentId,
      title: input.title,
      targetExamDate: input.targetExamDate,
    });

    const dailyMinutes = input.dailyStudyMinutesTarget ?? 45;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Determina a quantidade de dias para planejar (até o exame ou 7 dias por padrão)
    let planningDays = 7;
    if (input.targetExamDate) {
      const diffTime = input.targetExamDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      planningDays = Math.max(1, Math.min(diffDays, 30)); // Limita a até 30 dias de planejamento
    }

    // Distribuição balanceada de materiais e flashcards ao longo dos dias
    const materialIds = materials.map(m => m.id);
    const flashcardIds = flashcards.map(f => f.id);
    const subjectsList = input.subjects && input.subjects.length > 0 ? input.subjects : [];

    for (let dayIndex = 0; dayIndex < planningDays; dayIndex++) {
      const scheduleDate = new Date(today);
      scheduleDate.setDate(scheduleDate.getDate() + dayIndex);

      // Fatiamento de itens por dia
      const dayMaterials = materialIds.filter((_, idx) => idx % planningDays === dayIndex);
      const dayFlashcards = flashcardIds.filter((_, idx) => idx % planningDays === dayIndex);
      const currentSubject = subjectsList.length > 0 ? subjectsList[dayIndex % subjectsList.length] : undefined;

      schedule.addItem({
        date: scheduleDate,
        dailyTargetMinutes: dailyMinutes,
        subject: currentSubject,
        topic: currentSubject ? `Revisão e Prática de ${currentSubject}` : 'Sessão de Estudos Generalista',
        materialIds: dayMaterials,
        flashcardIds: dayFlashcards,
        quizIds: [],
      });
    }

    await this.scheduleRepository.save(schedule);
    return schedule;
  }
}
