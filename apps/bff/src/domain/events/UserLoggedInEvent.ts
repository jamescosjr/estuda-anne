import { IDomainEvent } from './DomainEventBus.js';

export interface UserLoggedInPayload {
  userId: string;
  studentName: string;
  email: string;
  subjects?: string[];
}

export class UserLoggedInEvent implements IDomainEvent {
  public static readonly EVENT_NAME = 'UserLoggedInEvent';
  public readonly eventName = UserLoggedInEvent.EVENT_NAME;
  public readonly occurredOn: Date;

  constructor(public readonly payload: UserLoggedInPayload) {
    this.occurredOn = new Date();
  }
}
