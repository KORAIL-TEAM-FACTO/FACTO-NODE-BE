import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

/**
 * Chat Message Persistence Entity
 *
 * @description TypeORM 엔티티 - 채팅 메시지 영속화
 */
@Entity('chat_messages')
@Index(['sessionId', 'createdAt'])
export class ChatMessageEntity {
  @PrimaryColumn({ name: 'id', type: 'varchar', length: 36 })
  id: string;

  @Column({ name: 'session_id', type: 'varchar', length: 255 })
  sessionId: string;

  @Column({ name: 'sender', type: 'varchar', length: 50 })
  sender: 'user' | 'assistant' | 'system';

  @Column({ name: 'message_type', type: 'varchar', length: 50 })
  messageType: string;

  @Column({ name: 'content', type: 'text' })
  content: string;

  @Column({ name: 'metadata', type: 'json', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
