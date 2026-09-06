export interface IDomainEvent {
  readonly eventName: string;
  readonly occurredOn: Date;
}

export type DomainEventHandler<T extends IDomainEvent = IDomainEvent> = (event: T) => Promise<void> | void;

export class DomainEventBus {
  private static instance: DomainEventBus;
  private handlers: Map<string, Set<DomainEventHandler<any>>> = new Map();

  private constructor() {}

  public static getInstance(): DomainEventBus {
    if (!DomainEventBus.instance) {
      DomainEventBus.instance = new DomainEventBus();
    }
    return DomainEventBus.instance;
  }

  public subscribe<T extends IDomainEvent>(eventName: string, handler: DomainEventHandler<T>): void {
    if (!this.handlers.has(eventName)) {
      this.handlers.set(eventName, new Set());
    }
    this.handlers.get(eventName)!.add(handler);
  }

  public unsubscribe<T extends IDomainEvent>(eventName: string, handler: DomainEventHandler<T>): void {
    const handlerSet = this.handlers.get(eventName);
    if (handlerSet) {
      handlerSet.delete(handler);
    }
  }

  public async publish<T extends IDomainEvent>(event: T): Promise<void> {
    const handlerSet = this.handlers.get(event.eventName);
    if (handlerSet && handlerSet.size > 0) {
      const promises = Array.from(handlerSet).map(handler =>
        Promise.resolve().then(() => handler(event)).catch(err => {
          console.error(`[DomainEventBus] Erro ao reter evento ${event.eventName}:`, err);
        })
      );
      await Promise.all(promises);
    }
  }

  public clearHandlers(): void {
    this.handlers.clear();
  }
}
