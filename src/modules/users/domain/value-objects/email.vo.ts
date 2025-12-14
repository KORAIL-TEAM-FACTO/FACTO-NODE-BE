import { ValueObject } from '../../../../shared/domain/value-object';
import { InvalidValueException } from '../../../../common/exceptions/domain.exception';

interface EmailProps {
  value: string;
}

/**
 * Email Value Object
 */
export class Email extends ValueObject<EmailProps> {
  private constructor(props: EmailProps) {
    super(props);
  }

  get value(): string {
    return this.props.value;
  }

  static create(email: string): Email {
    if (!this.isValid(email)) {
      throw new InvalidValueException('email', email);
    }
    return new Email({ value: email.toLowerCase() });
  }

  private static isValid(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}
