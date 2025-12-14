import { ValueObject } from '../../../../shared/domain/value-object';
import { InvalidValueException } from '../../../../common/exceptions/domain.exception';

/**
 * Call Status Value Object
 *
 * @description 통화 상태를 나타내는 값 객체
 */

export enum CallStatusEnum {
  INITIATING = 'INITIATING', // 통화 시작 중
  RINGING = 'RINGING', // 연결 대기 중
  CONNECTING = 'CONNECTING', // 연결 중
  IN_PROGRESS = 'IN_PROGRESS', // 통화 중
  ENDED = 'ENDED', // 통화 종료
  FAILED = 'FAILED', // 통화 실패
}

interface CallStatusProps {
  value: CallStatusEnum;
}

export class CallStatus extends ValueObject<CallStatusProps> {
  private constructor(props: CallStatusProps) {
    super(props);
  }

  get value(): CallStatusEnum {
    return this.props.value;
  }

  static create(status: CallStatusEnum): CallStatus {
    if (!Object.values(CallStatusEnum).includes(status)) {
      throw new InvalidValueException('callStatus', status);
    }
    return new CallStatus({ value: status });
  }

  static initiating(): CallStatus {
    return new CallStatus({ value: CallStatusEnum.INITIATING });
  }

  static ringing(): CallStatus {
    return new CallStatus({ value: CallStatusEnum.RINGING });
  }

  static connecting(): CallStatus {
    return new CallStatus({ value: CallStatusEnum.CONNECTING });
  }

  static inProgress(): CallStatus {
    return new CallStatus({ value: CallStatusEnum.IN_PROGRESS });
  }

  static ended(): CallStatus {
    return new CallStatus({ value: CallStatusEnum.ENDED });
  }

  static failed(): CallStatus {
    return new CallStatus({ value: CallStatusEnum.FAILED });
  }

  isActive(): boolean {
    return [
      CallStatusEnum.INITIATING,
      CallStatusEnum.RINGING,
      CallStatusEnum.CONNECTING,
      CallStatusEnum.IN_PROGRESS,
    ].includes(this.value);
  }

  canTransitionTo(newStatus: CallStatusEnum): boolean {
    const transitions: Record<CallStatusEnum, CallStatusEnum[]> = {
      [CallStatusEnum.INITIATING]: [
        CallStatusEnum.RINGING,
        CallStatusEnum.FAILED,
        CallStatusEnum.ENDED,
      ],
      [CallStatusEnum.RINGING]: [
        CallStatusEnum.CONNECTING,
        CallStatusEnum.FAILED,
        CallStatusEnum.ENDED,
      ],
      [CallStatusEnum.CONNECTING]: [
        CallStatusEnum.IN_PROGRESS,
        CallStatusEnum.FAILED,
        CallStatusEnum.ENDED,
      ],
      [CallStatusEnum.IN_PROGRESS]: [CallStatusEnum.ENDED],
      [CallStatusEnum.ENDED]: [],
      [CallStatusEnum.FAILED]: [],
    };

    return transitions[this.value].includes(newStatus);
  }
}
