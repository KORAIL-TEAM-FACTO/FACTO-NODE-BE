import { Injectable, Inject } from '@nestjs/common';
import { ChatMessage } from '../../domain/entities/ChatMessage.entity';
import { MessageType } from '../../domain/value-objects/MessageType.vo';
import { ChatMessageResponse } from '../dto/response/ChatMessageResponse.dto';
import type { IChatMessageRepository } from '../../domain/repositories/ChatMessageRepository.interface';
import { CHAT_MESSAGE_REPOSITORY } from '../../domain/repositories/ChatMessageRepository.interface';
import type { IChatSessionRepository } from '../../domain/repositories/ChatSessionRepository.interface';
import { CHAT_SESSION_REPOSITORY } from '../../domain/repositories/ChatSessionRepository.interface';
import { ChatSessionNotFoundException } from '../../domain/exceptions/ChatSessionNotFoundException';

/**
 * Send Chat Message Use Case
 *
 * @description 채팅 메시지를 전송합니다
 */
@Injectable()
export class SendChatMessageUseCase {
  constructor(
    @Inject(CHAT_MESSAGE_REPOSITORY)
    private readonly messageRepository: IChatMessageRepository,
    @Inject(CHAT_SESSION_REPOSITORY)
    private readonly sessionRepository: IChatSessionRepository,
  ) {}

  async execute(
    sessionId: string,
    sender: 'user' | 'assistant' | 'system',
    content: string,
    messageTypeStr: string = 'TEXT',
    metadata?: Record<string, any>,
  ): Promise<ChatMessageResponse> {
    // 세션 존재 확인
    const session = await this.sessionRepository.findBySessionId(sessionId);
    if (!session) {
      throw new ChatSessionNotFoundException(sessionId);
    }

    // 세션 활동 업데이트
    session.updateActivity();
    await this.sessionRepository.update(session);

    // 메시지 타입 변환
    const messageType = MessageType.fromString(messageTypeStr);

    // 메시지 생성
    const message = ChatMessage.create(
      sessionId,
      sender,
      messageType,
      content,
      metadata,
    );

    // 저장
    const savedMessage = await this.messageRepository.save(message);

    return ChatMessageResponse.fromEntity(savedMessage);
  }
}
