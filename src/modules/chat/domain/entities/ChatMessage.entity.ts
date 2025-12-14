import { AggregateRoot } from '../../../../shared/domain/aggregate-root';
import { MessageType } from '../value-objects/MessageType.vo';

/**
 * ChatMessage Entity
 *
 * @description
 * - 채팅 메시지 도메인 엔티티
 * - 사용자/AI 메시지 관리
 */
export class ChatMessage extends AggregateRoot {
  private _sessionId: string;
  private _sender: 'user' | 'assistant' | 'system';
  private _messageType: MessageType;
  private _content: string;
  private _metadata?: Record<string, any>;

  private constructor(
    id: string,
    sessionId: string,
    sender: 'user' | 'assistant' | 'system',
    messageType: MessageType,
    content: string,
    metadata?: Record<string, any>,
    createdAt?: Date,
    updatedAt?: Date,
  ) {
    super(id, createdAt, updatedAt);
    this._sessionId = sessionId;
    this._sender = sender;
    this._messageType = messageType;
    this._content = content;
    this._metadata = metadata;
  }

  // Getters
  get sessionId(): string {
    return this._sessionId;
  }

  get sender(): 'user' | 'assistant' | 'system' {
    return this._sender;
  }

  get messageType(): MessageType {
    return this._messageType;
  }

  get content(): string {
    return this._content;
  }

  get metadata(): Record<string, any> | undefined {
    return this._metadata;
  }

  /**
   * Factory method for creating new message
   */
  static create(
    sessionId: string,
    sender: 'user' | 'assistant' | 'system',
    messageType: MessageType,
    content: string,
    metadata?: Record<string, any>,
  ): ChatMessage {
    return new ChatMessage(
      crypto.randomUUID(),
      sessionId,
      sender,
      messageType,
      content,
      metadata,
      new Date(),
      new Date(),
    );
  }

  /**
   * Factory method for reconstitution from DB
   */
  static reconstitute(
    id: string,
    sessionId: string,
    sender: 'user' | 'assistant' | 'system',
    messageType: MessageType,
    content: string,
    metadata: Record<string, any> | undefined,
    createdAt: Date,
    updatedAt: Date,
  ): ChatMessage {
    return new ChatMessage(
      id,
      sessionId,
      sender,
      messageType,
      content,
      metadata,
      createdAt,
      updatedAt,
    );
  }
}
