import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { IChatMessageRepository } from '../../domain/repositories/ChatMessageRepository.interface';
import { ChatMessage } from '../../domain/entities/ChatMessage.entity';
import { MessageType } from '../../domain/value-objects/MessageType.vo';
import { ChatMessageEntity } from '../persistence/ChatMessageEntity';

/**
 * Chat Message Repository Implementation
 *
 * @description TypeORM을 사용한 채팅 메시지 리포지토리 구현
 */
@Injectable()
export class ChatMessageRepository implements IChatMessageRepository {
  constructor(
    @InjectRepository(ChatMessageEntity)
    private readonly repository: Repository<ChatMessageEntity>,
  ) {}

  async findById(id: string): Promise<ChatMessage | null> {
    const entity = await this.repository.findOne({ where: { id } });
    return entity ? this.toDomain(entity) : null;
  }

  async findBySessionId(sessionId: string, limit: number = 50): Promise<ChatMessage[]> {
    const entities = await this.repository.find({
      where: { sessionId },
      order: { createdAt: 'ASC' },
      take: limit,
    });
    return entities.map((entity) => this.toDomain(entity));
  }

  async save(message: ChatMessage): Promise<ChatMessage> {
    const entity = this.toEntity(message);
    const saved = await this.repository.save(entity);
    return this.toDomain(saved);
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  async deleteBySessionId(sessionId: string): Promise<void> {
    await this.repository.delete({ sessionId });
  }

  /**
   * Domain Entity → Persistence Entity
   */
  private toEntity(message: ChatMessage): ChatMessageEntity {
    const entity = new ChatMessageEntity();
    entity.id = message.id;
    entity.sessionId = message.sessionId;
    entity.sender = message.sender;
    entity.messageType = message.messageType.toString();
    entity.content = message.content;
    entity.metadata = message.metadata;
    entity.createdAt = message.createdAt;
    entity.updatedAt = message.updatedAt;
    return entity;
  }

  /**
   * Persistence Entity → Domain Entity
   */
  private toDomain(entity: ChatMessageEntity): ChatMessage {
    return ChatMessage.reconstitute(
      entity.id,
      entity.sessionId,
      entity.sender,
      MessageType.fromString(entity.messageType),
      entity.content,
      entity.metadata,
      entity.createdAt,
      entity.updatedAt,
    );
  }
}
