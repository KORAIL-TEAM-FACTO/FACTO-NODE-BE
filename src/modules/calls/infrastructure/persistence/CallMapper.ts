import { Call } from '../../domain/entities/Call.entity';
import { CallEntity } from './CallEntity';

/**
 * Call Mapper
 *
 * @description 도메인 엔티티 <-> TypeORM 엔티티 변환
 */
export class CallMapper {
  /**
   * 도메인 엔티티 -> TypeORM 엔티티
   */
  static toPersistence(domain: Call): CallEntity {
    const entity = new CallEntity();
    entity.id = domain.id;
    entity.callerNumber = domain.callerNumber.value;
    entity.receiverNumber = domain.receiverNumber?.value || null;
    entity.status = domain.status.value;
    entity.sessionId = domain.sessionId;
    entity.startedAt = domain.startedAt;
    entity.endedAt = domain.endedAt;
    entity.duration = domain.duration;
    entity.transcript = domain.transcript.length > 0 ? domain.transcript : null;
    entity.aiContext = Object.keys(domain.aiContext).length > 0 ? domain.aiContext : null;
    entity.webrtcSessionData = Object.keys(domain.webrtcSessionData).length > 0 ? domain.webrtcSessionData : null;
    entity.createdAt = domain.createdAt;
    entity.updatedAt = domain.updatedAt;
    return entity;
  }

  /**
   * TypeORM 엔티티 -> 도메인 엔티티
   */
  static toDomain(entity: CallEntity): Call {
    return Call.reconstitute(
      entity.id,
      entity.callerNumber,
      entity.receiverNumber,
      entity.status,
      entity.sessionId,
      entity.createdAt,
      entity.updatedAt,
      entity.startedAt,
      entity.endedAt,
      entity.duration,
      entity.transcript || [],
      entity.aiContext || {},
      entity.webrtcSessionData || {},
    );
  }
}
