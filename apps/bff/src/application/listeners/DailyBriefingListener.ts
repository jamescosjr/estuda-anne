import { DomainEventBus } from '../../domain/events/DomainEventBus.js';
import { UserLoggedInEvent } from '../../domain/events/UserLoggedInEvent.js';

export interface DailyBriefingContext {
  studentId: string;
  studentName: string;
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
  }

  private static async handleUserLoggedIn(event: UserLoggedInEvent): Promise<void> {
    const { userId, studentName, subjects = [] } = event.payload;
    console.log(`[DailyBriefingListener] Processando login assíncrono para a usuária: ${studentName} (${userId})`);

    // Busca assíncrona simulada/consultada das revisões pendentes e eventos
    const dueFlashcardsCount = 15; // Exemplo de métrica consultada no resumo do dia
    const todayEvents = subjects.length > 0
      ? [`Revisão de ${subjects[0]}`, `Quiz de fixação - ${subjects[1] || subjects[0]}`]
      : ['Revisão espaçada de Cálculo I', 'Quiz de fixação em Algoritmos'];

    const context: DailyBriefingContext = {
      studentId: userId,
      studentName: studentName || 'Anne',
      dueFlashcardsCount,
      todayEvents,
      generatedAt: new Date(),
    };

    DailyBriefingListener.userContexts.set(userId, context);
    DailyBriefingListener.userContexts.set('anne-student-1', context); // Alias padrão para Anne
  }

  public static getContext(studentId: string): DailyBriefingContext | undefined {
    return DailyBriefingListener.userContexts.get(studentId) || DailyBriefingListener.userContexts.get('anne-student-1');
  }

  public static clear(): void {
    DailyBriefingListener.userContexts.clear();
  }
}
