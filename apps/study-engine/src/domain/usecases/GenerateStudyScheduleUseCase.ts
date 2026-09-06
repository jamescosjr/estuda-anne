import { StudySchedule } from '../entities/StudySchedule.js';
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
  periodStartDate?: Date;
  examDates?: Array<{ subject?: string; title?: string; date: string }>;
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
    const flashcards = await this.flashcardRepository.findDueCards(
      input.studentId,
      new Date(),
      80
    );

    const targetExamDate = this.resolveTargetExamDate(input);

    const schedule = StudySchedule.create({
      studentId: input.studentId,
      title: input.title,
      targetExamDate,
    });

    const dailyMinutes = input.dailyStudyMinutesTarget ?? 45;
    const today = this.resolvePlanningStart(input.periodStartDate);

    let planningDays = 7;
    if (targetExamDate) {
      const diffTime = targetExamDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      planningDays = Math.max(1, Math.min(diffDays, 30));
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
    const persisted = await this.scheduleRepository.findByStudentId(input.studentId);
    return persisted ?? schedule;
  }

  private resolveTargetExamDate(input: GenerateStudyScheduleInput): Date | undefined {
    if (input.targetExamDate && !Number.isNaN(input.targetExamDate.getTime()) && input.targetExamDate.getTime() > Date.now()) {
      return input.targetExamDate;
    }
    if (!input.examDates || input.examDates.length === 0) {
      return undefined;
    }
    const upcoming = input.examDates
      .map((exam) => new Date(exam.date))
      .filter((date) => !Number.isNaN(date.getTime()) && date.getTime() > Date.now())
      .sort((a, b) => a.getTime() - b.getTime());
    return upcoming[0];
  }

  private resolvePlanningStart(periodStartDate?: Date): Date {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (!periodStartDate) {
      return today;
    }
    const start = new Date(periodStartDate);
    start.setHours(0, 0, 0, 0);
    return start.getTime() > today.getTime() ? start : today;
  }
}
