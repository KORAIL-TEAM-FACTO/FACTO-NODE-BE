import { ValueObject } from '../../../../shared/domain/value-object';
import { InvalidValueException } from '../../../../common/exceptions/domain.exception';

/**
 * Phone Number Value Object
 *
 * @description 전화번호를 나타내는 값 객체
 */

interface PhoneNumberProps {
  value: string;
}

export class PhoneNumber extends ValueObject<PhoneNumberProps> {
  private constructor(props: PhoneNumberProps) {
    super(props);
  }

  get value(): string {
    return this.props.value;
  }

  static create(phoneNumber: string): PhoneNumber {
    const normalized = this.normalize(phoneNumber);

    if (!this.isValid(normalized)) {
      throw new InvalidValueException('phoneNumber', phoneNumber);
    }

    return new PhoneNumber({ value: normalized });
  }

  private static normalize(phoneNumber: string): string {
    // Remove all non-digit characters except +
    return phoneNumber.replace(/[^\d+]/g, '');
  }

  private static isValid(phoneNumber: string): boolean {
    // Allow international format (+82...) or local format (010...)
    const internationalPattern = /^\+\d{10,15}$/;
    const localPattern = /^0\d{9,10}$/;

    return (
      internationalPattern.test(phoneNumber) || localPattern.test(phoneNumber)
    );
  }

  /**
   * Format phone number for display
   * Example: 01012345678 -> 010-1234-5678
   */
  format(): string {
    const number = this.props.value;

    if (number.startsWith('+82')) {
      // International format
      return number;
    }

    // Korean mobile format: 010-XXXX-XXXX
    if (number.startsWith('010') && number.length === 11) {
      return `${number.slice(0, 3)}-${number.slice(3, 7)}-${number.slice(7)}`;
    }

    return number;
  }
}
