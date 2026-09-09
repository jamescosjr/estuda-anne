import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DomainEventBus } from '../../../src/domain/events/DomainEventBus.js';
import { UserLoggedInEvent } from '../../../src/domain/events/UserLoggedInEvent.js';
import { UserProfileUpdatedEvent } from '../../../src/domain/events/UserProfileUpdatedEvent.js';
import { DailyBriefingListener } from '../../../src/application/listeners/DailyBriefingListener.js';

describe('DomainEventBus & DailyBriefingListener', () => {
  beforeEach(() => {
    DomainEventBus.getInstance().clearHandlers();
    DailyBriefingListener.clear();
  });

  it('deve publicar o evento UserLoggedInEvent e registrar as matérias do estudante', async () => {
    DailyBriefingListener.initialize();

    const event = new UserLoggedInEvent({
      userId: 'anne-test-id',
      studentName: 'Anne Frank',
      email: 'anne@estudante.com',
      subjects: ['Fundamentos de IA', 'LLMs para Programadores'],
    });

    await DomainEventBus.getInstance().publish(event);

    const context = DailyBriefingListener.getContext('anne-test-id');
    expect(context).toBeDefined();
    expect(context?.studentName).toBe('Anne Frank');
    expect(context?.subjects).toEqual(['Fundamentos de IA', 'LLMs para Programadores']);
    expect(context?.todayEvents).toEqual(['Revisão de Fundamentos de IA', 'Revisão de LLMs para Programadores']);
  });

  it('deve atualizar instantaneamente o contexto quando UserProfileUpdatedEvent for publicado', async () => {
    DailyBriefingListener.initialize();

    // 1. Login inicial com Fundamentos de IA
    await DomainEventBus.getInstance().publish(
      new UserLoggedInEvent({
        userId: 'james-id',
        studentName: 'James Júnior',
        email: 'james@ufmg.br',
        subjects: ['Fundamentos de IA'],
      })
    );

    let context = DailyBriefingListener.getContext('james-id');
    expect(context?.subjects).toEqual(['Fundamentos de IA']);

    // 2. Atualização de perfil para apenas Francês
    await DomainEventBus.getInstance().publish(
      new UserProfileUpdatedEvent({
        userId: 'james-id',
        studentName: 'James Júnior',
        email: 'james@ufmg.br',
        subjects: ['Francês'],
      })
    );

    context = DailyBriefingListener.getContext('james-id');
    expect(context?.subjects).toEqual(['Francês']);
    expect(context?.todayEvents).toEqual(['Revisão de Francês']);
  });

  it('não deve vazar contexto para IDs não cadastrados', () => {
    DailyBriefingListener.initialize();
    expect(DailyBriefingListener.getContext('unknown-user-id')).toBeUndefined();
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

