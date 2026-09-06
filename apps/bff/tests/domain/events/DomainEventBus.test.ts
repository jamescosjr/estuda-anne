import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DomainEventBus } from '../../../src/domain/events/DomainEventBus.js';
import { UserLoggedInEvent } from '../../../src/domain/events/UserLoggedInEvent.js';
import { DailyBriefingListener } from '../../../src/application/listeners/DailyBriefingListener.js';

describe('DomainEventBus & UserLoggedInEvent', () => {
  beforeEach(() => {
    DomainEventBus.getInstance().clearHandlers();
    DailyBriefingListener.clear();
  });

  it('deve publicar o evento UserLoggedInEvent e notificar os listeners registrados de forma assíncrona', async () => {
    DailyBriefingListener.initialize();

    const event = new UserLoggedInEvent({
      userId: 'anne-test-id',
      studentName: 'Anne Frank',
      email: 'anne@estudante.com',
      subjects: ['Cálculo I', 'Estruturas de Dados'],
    });

    await DomainEventBus.getInstance().publish(event);

    const context = DailyBriefingListener.getContext('anne-test-id');
    expect(context).toBeDefined();
    expect(context?.studentName).toBe('Anne Frank');
    expect(context?.dueFlashcardsCount).toBeGreaterThan(0);
    expect(context?.todayEvents.length).toBeGreaterThan(0);
  });

  it('deve permitir cancelar inscrição de manipuladores', async () => {
    const handler = vi.fn();
    const eventName = 'TestEvent';

    DomainEventBus.getInstance().subscribe(eventName, handler);
    DomainEventBus.getInstance().unsubscribe(eventName, handler);

    await DomainEventBus.getInstance().publish({
      eventName,
      occurredOn: new Date(),
    });

    expect(handler).not.toHaveBeenCalled();
  });
});
