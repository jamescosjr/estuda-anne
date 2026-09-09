import { IDomainEvent } from './DomainEventBus.js';

export interface UserProfileUpdatedPayload {
  userId: string;
  studentName: string;
  email?: string;
  subjects?: string[];
}

export class UserProfileUpdatedEvent implements IDomainEvent {
  public static readonly EVENT_NAME = 'UserProfileUpdatedEvent';
  public readonly eventName = UserProfileUpdatedEvent.EVENT_NAME;
  public readonly occurredOn: Date;

  constructor(public readonly payload: UserProfileUpdatedPayload) {
    this.occurredOn = new Date();
  }
}
