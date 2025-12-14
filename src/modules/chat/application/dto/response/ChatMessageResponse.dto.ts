import { ApiProperty } from '@nestjs/swagger';
import { ChatMessage } from '../../../domain/entities/ChatMessage.entity';

/**
 * Chat Message Response DTO
 *
 * @description 채팅 메시지 응답 데이터
 */
export class ChatMessageResponse {
  @ApiProperty({ description: '메시지 ID' })
  id: string;

  @ApiProperty({ description: '세션 ID' })
  sessionId: string;

  @ApiProperty({ description: '발신자', enum: ['user', 'assistant', 'system'] })
  sender: 'user' | 'assistant' | 'system';

  @ApiProperty({ description: '메시지 타입', enum: ['TEXT', 'AUDIO', 'SYSTEM'] })
  messageType: string;

  @ApiProperty({ description: '메시지 내용' })
  content: string;

  @ApiProperty({ description: '메타데이터', required: false })
  metadata?: Record<string, any>;

  @ApiProperty({ description: '생성 시간' })
  createdAt: Date;

  /**
   * Convert domain entity to response DTO
   */
  static fromEntity(message: ChatMessage): ChatMessageResponse {
    return {
      id: message.id,
      sessionId: message.sessionId,
      sender: message.sender,
      messageType: message.messageType.toString(),
      content: message.content,
      metadata: message.metadata,
      createdAt: message.createdAt,
    };
  }
}
