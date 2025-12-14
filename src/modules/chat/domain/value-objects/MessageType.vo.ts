import { ValueObject } from '../../../../shared/domain/value-object';

/**
 * Message Type Value Object
 *
 * @description 채팅 메시지 타입
 */
export enum MessageTypeEnum {
  TEXT = 'TEXT',
  AUDIO = 'AUDIO',
  SYSTEM = 'SYSTEM',
}

interface MessageTypeProps {
  value: MessageTypeEnum;
}

export class MessageType extends ValueObject<MessageTypeProps> {
  private constructor(props: MessageTypeProps) {
    super(props);
  }

  get value(): MessageTypeEnum {
    return this.props.value;
  }

  static text(): MessageType {
    return new MessageType({ value: MessageTypeEnum.TEXT });
  }

  static audio(): MessageType {
    return new MessageType({ value: MessageTypeEnum.AUDIO });
  }

  static system(): MessageType {
    return new MessageType({ value: MessageTypeEnum.SYSTEM });
  }

  static fromString(type: string): MessageType {
    switch (type.toUpperCase()) {
      case 'TEXT':
        return MessageType.text();
      case 'AUDIO':
        return MessageType.audio();
      case 'SYSTEM':
        return MessageType.system();
      default:
        throw new Error(`Invalid message type: ${type}`);
    }
  }

  toString(): string {
    return this.props.value;
  }
}
