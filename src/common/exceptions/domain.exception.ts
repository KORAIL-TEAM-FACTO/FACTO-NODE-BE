/**
 * Domain Exception - 도메인 레벨 예외
 */
export class DomainException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DomainException';
    Error.captureStackTrace(this, this.constructor);
  }
}

export class EntityNotFoundException extends DomainException {
  constructor(entityName: string, id: string) {
    super(`${entityName} with id ${id} not found`);
    this.name = 'EntityNotFoundException';
  }
}

export class InvalidValueException extends DomainException {
  constructor(field: string, value: any) {
    super(`Invalid value for ${field}: ${value}`);
    this.name = 'InvalidValueException';
  }
}
