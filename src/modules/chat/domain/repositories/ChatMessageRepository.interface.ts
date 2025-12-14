import { ChatMessage } from '../entities/ChatMessage.entity';

/**
 * Chat Message Repository Interface
 *
 * @description 채팅 메시지 데이터 접근 인터페이스
 */
export interface IChatMessageRepository {
  findById(id: string): Promise<ChatMessage | null>;
  findBySessionId(sessionId: string, limit?: number): Promise<ChatMessage[]>;
  save(message: ChatMessage): Promise<ChatMessage>;
  delete(id: string): Promise<void>;
  deleteBySessionId(sessionId: string): Promise<void>;
}

export const CHAT_MESSAGE_REPOSITORY = Symbol('CHAT_MESSAGE_REPOSITORY');
