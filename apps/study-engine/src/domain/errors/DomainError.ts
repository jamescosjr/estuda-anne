export class DomainError extends Error {
  public readonly statusCode: number;

  constructor(message: string, statusCode: number, name = 'Error') {
    super(message);
    this.name = name;
    this.statusCode = statusCode;
  }
}

export class NotFoundError extends DomainError {
  constructor(message: string) {
    super(message, 404, 'NotFound');
  }
}
