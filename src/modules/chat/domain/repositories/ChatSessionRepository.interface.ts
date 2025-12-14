import { ChatSession } from '../entities/ChatSession.entity';

/**
 * Chat Session Repository Interface
 *
 * @description 채팅 세션 데이터 접근 인터페이스
 */
export interface IChatSessionRepository {
  findById(id: string): Promise<ChatSession | null>;
  findBySessionId(sessionId: string): Promise<ChatSession | null>;
  findByUserId(userId: string): Promise<ChatSession[]>;
  findActiveSessions(): Promise<ChatSession[]>;
  save(session: ChatSession): Promise<ChatSession>;
  update(session: ChatSession): Promise<ChatSession>;
  delete(id: string): Promise<void>;
}

export const CHAT_SESSION_REPOSITORY = Symbol('CHAT_SESSION_REPOSITORY');
