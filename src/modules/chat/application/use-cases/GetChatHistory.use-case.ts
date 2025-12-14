import { Injectable, Inject } from '@nestjs/common';
import { ChatMessageResponse } from '../dto/response/ChatMessageResponse.dto';
import type { IChatMessageRepository } from '../../domain/repositories/ChatMessageRepository.interface';
import { CHAT_MESSAGE_REPOSITORY } from '../../domain/repositories/ChatMessageRepository.interface';

/**
 * Get Chat History Use Case
 *
 * @description 채팅 히스토리를 조회합니다
 */
@Injectable()
export class GetChatHistoryUseCase {
  constructor(
    @Inject(CHAT_MESSAGE_REPOSITORY)
    private readonly messageRepository: IChatMessageRepository,
  ) {}

  async execute(sessionId: string, limit: number = 50): Promise<ChatMessageResponse[]> {
    const messages = await this.messageRepository.findBySessionId(sessionId, limit);

    return messages.map((message) => ChatMessageResponse.fromEntity(message));
  }
}
