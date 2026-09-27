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

export class UnprocessableError extends DomainError {
  constructor(message: string) {
    super(message, 422, 'UnprocessableEntity');
  }
}

/**
 * Recusa por violação de regra de negócio (Capítulo 5 - Cercando a IA).
 * Carrega `ruleId` obrigatório (ex: 'RN-STU-001') e `motivo`.
 * Garante rastreabilidade ponta a ponta: Doc -> Código -> Teste -> Exceção/Log.
 */
export class DomainRuleViolation extends DomainError {
  constructor(
    public readonly ruleId: string,
    public readonly motivo: string,
    statusCode = 422
  ) {
    super(`${ruleId}: ${motivo}`, statusCode, 'DomainRuleViolation');
  }
}
