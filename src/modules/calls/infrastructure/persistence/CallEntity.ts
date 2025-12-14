import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CallStatusEnum } from '../../domain/value-objects/CallStatus.vo';

/**
 * Call TypeORM Entity
 *
 * @description TypeORM 엔티티 - DB 테이블 매핑
 */
@Entity('calls')
export class CallEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ name: 'caller_number', type: 'varchar', length: 20 })
  callerNumber: string;

  @Column({
    name: 'receiver_number',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  receiverNumber: string | null;

  @Column({
    name: 'status',
    type: 'enum',
    enum: CallStatusEnum,
    default: CallStatusEnum.INITIATING,
  })
  status: CallStatusEnum;

  @Column({ name: 'session_id', type: 'uuid' })
  sessionId: string;

  @Column({ name: 'started_at', type: 'timestamp', nullable: true })
  startedAt: Date | null;

  @Column({ name: 'ended_at', type: 'timestamp', nullable: true })
  endedAt: Date | null;

  @Column({ name: 'duration', type: 'int', default: 0 })
  duration: number;

  @Column({ name: 'transcript', type: 'json', nullable: true })
  transcript: string[] | null;

  @Column({ name: 'ai_context', type: 'json', nullable: true })
  aiContext: Record<string, unknown> | null;

  @Column({ name: 'webrtc_session_data', type: 'json', nullable: true })
  webrtcSessionData: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
