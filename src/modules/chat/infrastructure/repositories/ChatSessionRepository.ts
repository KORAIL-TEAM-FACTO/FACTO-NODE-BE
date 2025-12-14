import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { IChatSessionRepository } from '../../domain/repositories/ChatSessionRepository.interface';
import { ChatSession } from '../../domain/entities/ChatSession.entity';
import { ChatSessionEntity } from '../persistence/ChatSessionEntity';

/**
 * Chat Session Repository Implementation
 *
 * @description TypeORM을 사용한 채팅 세션 리포지토리 구현
 */
@Injectable()
export class ChatSessionRepository implements IChatSessionRepository {
  constructor(
    @InjectRepository(ChatSessionEntity)
    private readonly repository: Repository<ChatSessionEntity>,
  ) {}

  async findById(id: string): Promise<ChatSession | null> {
    const entity = await this.repository.findOne({ where: { id } });
    return entity ? this.toDomain(entity) : null;
  }

  async findBySessionId(sessionId: string): Promise<ChatSession | null> {
    const entity = await this.repository.findOne({ where: { sessionId } });
    return entity ? this.toDomain(entity) : null;
  }

  async findByUserId(userId: string): Promise<ChatSession[]> {
    const entities = await this.repository.find({ where: { userId } });
    return entities.map((entity) => this.toDomain(entity));
  }

  async findActiveSessions(): Promise<ChatSession[]> {
    const entities = await this.repository.find({ where: { isActive: true } });
    return entities.map((entity) => this.toDomain(entity));
  }

  async save(session: ChatSession): Promise<ChatSession> {
    const entity = this.toEntity(session);
    const saved = await this.repository.save(entity);
    return this.toDomain(saved);
  }

  async update(session: ChatSession): Promise<ChatSession> {
    const entity = this.toEntity(session);
    const updated = await this.repository.save(entity);
    return this.toDomain(updated);
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  /**
   * Domain Entity → Persistence Entity
   */
  private toEntity(session: ChatSession): ChatSessionEntity {
    const entity = new ChatSessionEntity();
    entity.id = session.id;
    entity.userId = session.userId;
    entity.sessionId = session.sessionId;
    entity.isActive = session.isActive;
    entity.lastActivity = session.lastActivity;
    entity.createdAt = session.createdAt;
    entity.updatedAt = session.updatedAt;
    return entity;
  }

  /**
   * Persistence Entity → Domain Entity
   */
  private toDomain(entity: ChatSessionEntity): ChatSession {
    return ChatSession.reconstitute(
      entity.id,
      entity.userId,
      entity.sessionId,
      entity.isActive,
      entity.lastActivity,
      entity.createdAt,
      entity.updatedAt,
    );
  }
}
