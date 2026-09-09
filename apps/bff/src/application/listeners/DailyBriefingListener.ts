import { DomainEventBus } from '../../domain/events/DomainEventBus.js';
import { UserLoggedInEvent } from '../../domain/events/UserLoggedInEvent.js';
import { UserProfileUpdatedEvent } from '../../domain/events/UserProfileUpdatedEvent.js';

export interface DailyBriefingContext {
  studentId: string;
  studentName: string;
  subjects: string[];
  dueFlashcardsCount: number;
  todayEvents: string[];
  generatedAt: Date;
}

export class DailyBriefingListener {
  private static userContexts: Map<string, DailyBriefingContext> = new Map();

  public static initialize(): void {
    DomainEventBus.getInstance().subscribe<UserLoggedInEvent>(
      UserLoggedInEvent.EVENT_NAME,
      async (event) => {
        await DailyBriefingListener.handleUserLoggedIn(event);
      }
    );

    DomainEventBus.getInstance().subscribe<UserProfileUpdatedEvent>(
      UserProfileUpdatedEvent.EVENT_NAME,
      async (event) => {
        await DailyBriefingListener.handleUserProfileUpdated(event);
      }
    );
  }

  private static async handleUserLoggedIn(event: UserLoggedInEvent): Promise<void> {
    const { userId, studentName, subjects = [] } = event.payload;
    console.log(`[DailyBriefingListener] Processando login assíncrono para a usuária: ${studentName} (${userId})`);

    const cleanSubjects = subjects.map((s) => s.trim()).filter(Boolean);
    const todayEvents = cleanSubjects.map((s) => `Revisão de ${s}`);

    const context: DailyBriefingContext = {
      studentId: userId,
      studentName: studentName || 'Estudante',
      subjects: cleanSubjects,
      dueFlashcardsCount: 0,
      todayEvents,
      generatedAt: new Date(),
    };

    DailyBriefingListener.userContexts.set(userId, context);
  }

  private static async handleUserProfileUpdated(event: UserProfileUpdatedEvent): Promise<void> {
    const { userId, studentName, subjects = [] } = event.payload;
    console.log(`[DailyBriefingListener] Atualizando contexto de perfil para: ${studentName} (${userId})`);

    const cleanSubjects = subjects.map((s) => s.trim()).filter(Boolean);
    const todayEvents = cleanSubjects.map((s) => `Revisão de ${s}`);

    const context: DailyBriefingContext = {
      studentId: userId,
      studentName: studentName || 'Estudante',
      subjects: cleanSubjects,
      dueFlashcardsCount: 0,
      todayEvents,
      generatedAt: new Date(),
    };

    DailyBriefingListener.userContexts.set(userId, context);
  }

  public static getContext(studentId: string): DailyBriefingContext | undefined {
    return DailyBriefingListener.userContexts.get(studentId);
  }

  public static clear(): void {
    DailyBriefingListener.userContexts.clear();
  }
}

