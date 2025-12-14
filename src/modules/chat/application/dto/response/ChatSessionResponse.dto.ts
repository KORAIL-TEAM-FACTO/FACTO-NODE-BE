import { ApiProperty } from '@nestjs/swagger';
import { ChatSession } from '../../../domain/entities/ChatSession.entity';

/**
 * Chat Session Response DTO
 *
 * @description 채팅 세션 응답 데이터
 */
export class ChatSessionResponse {
  @ApiProperty({ description: '세션 ID (Primary Key)' })
  id: string;

  @ApiProperty({ description: '사용자 ID' })
  userId: string;

  @ApiProperty({ description: '세션 ID (WebSocket용)' })
  sessionId: string;

  @ApiProperty({ description: '활성 상태' })
  isActive: boolean;

  @ApiProperty({ description: '마지막 활동 시간' })
  lastActivity: Date;

  @ApiProperty({ description: '생성 시간' })
  createdAt: Date;

  @ApiProperty({ description: '수정 시간' })
  updatedAt: Date;

  /**
   * Convert domain entity to response DTO
   */
  static fromEntity(session: ChatSession): ChatSessionResponse {
    return {
      id: session.id,
      userId: session.userId,
      sessionId: session.sessionId,
      isActive: session.isActive,
      lastActivity: session.lastActivity,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    };
  }
}
