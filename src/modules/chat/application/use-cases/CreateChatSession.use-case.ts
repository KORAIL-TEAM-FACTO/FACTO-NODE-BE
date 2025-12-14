import { Injectable, Inject } from '@nestjs/common';
import { ChatSession } from '../../domain/entities/ChatSession.entity';
import { ChatSessionResponse } from '../dto/response/ChatSessionResponse.dto';
import type { IChatSessionRepository } from '../../domain/repositories/ChatSessionRepository.interface';
import { CHAT_SESSION_REPOSITORY } from '../../domain/repositories/ChatSessionRepository.interface';

/**
 * Create Chat Session Use Case
 *
 * @description 새로운 채팅 세션을 생성합니다
 */
@Injectable()
export class CreateChatSessionUseCase {
  constructor(
    @Inject(CHAT_SESSION_REPOSITORY)
    private readonly sessionRepository: IChatSessionRepository,
  ) {}

  async execute(userId: string, sessionId: string): Promise<ChatSessionResponse> {
    // 세션 생성
    const session = ChatSession.create(userId, sessionId);

    // 저장
    const savedSession = await this.sessionRepository.save(session);

    return ChatSessionResponse.fromEntity(savedSession);
  }
}
