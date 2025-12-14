import { AggregateRoot } from '../../../../shared/domain/aggregate-root';
import { Email } from '../value-objects/email.vo';
import { InvalidValueException } from '../../../../common/exceptions/domain.exception';

/**
 * User Entity - Aggregate Root
 */
export class User extends AggregateRoot {
  private _name: string;
  private _email: Email;
  private _isActive: boolean;

  private constructor(
    id: string,
    name: string,
    email: Email,
    isActive: boolean,
    createdAt?: Date,
    updatedAt?: Date,
  ) {
    super(id, createdAt, updatedAt);
    this._name = name;
    this._email = email;
    this._isActive = isActive;
  }

  get name(): string {
    return this._name;
  }

  get email(): Email {
    return this._email;
  }

  get isActive(): boolean {
    return this._isActive;
  }

  // Factory Method
  static create(name: string, email: string): User {
    if (!name || name.trim().length === 0) {
      throw new InvalidValueException('name', name);
    }

    const emailVO = Email.create(email);
    const id = this.generateId();

    return new User(id, name, emailVO, true);
  }

  // Reconstitute from persistence
  static reconstitute(
    id: string,
    name: string,
    email: string,
    isActive: boolean,
    createdAt: Date,
    updatedAt: Date,
  ): User {
    const emailVO = Email.create(email);
    return new User(id, name, emailVO, isActive, createdAt, updatedAt);
  }

  // Business methods
  updateName(name: string): void {
    if (!name || name.trim().length === 0) {
      throw new InvalidValueException('name', name);
    }
    this._name = name;
    this.touch();
  }

  updateEmail(email: string): void {
    this._email = Email.create(email);
    this.touch();
  }

  activate(): void {
    this._isActive = true;
    this.touch();
  }

  deactivate(): void {
    this._isActive = false;
    this.touch();
  }

  private static generateId(): string {
    return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
