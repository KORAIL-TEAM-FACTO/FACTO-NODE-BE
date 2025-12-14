import { ValueObject } from '../../../../shared/domain/value-object';

interface ServiceIdProps {
  value: string;
}

/**
 * Service ID Value Object
 *
 * @description 복지 서비스 ID를 나타내는 Value Object
 */
export class ServiceId extends ValueObject<ServiceIdProps> {
  private constructor(props: ServiceIdProps) {
    super(props);
  }

  get value(): string {
    return this.props.value;
  }

  /**
   * 서비스 ID 생성
   *
   * @param serviceId - 서비스 ID 문자열
   * @returns ServiceId Value Object
   * @throws {Error} 잘못된 서비스 ID 형식일 때
   */
  static create(serviceId: string): ServiceId {
    if (!serviceId || serviceId.trim().length === 0) {
      throw new Error('서비스 ID는 필수입니다');
    }

    return new ServiceId({ value: serviceId.trim() });
  }
}
