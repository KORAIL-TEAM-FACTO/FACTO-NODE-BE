import { ApiProperty } from '@nestjs/swagger';
import { Call } from '../../../domain/entities/Call.entity';
import { CallStatusEnum } from '../../../domain/value-objects/CallStatus.vo';

/**
 * Call Response DTO
 *
 * @description 통화 정보 응답 데이터
 */
export class CallResponseDto {
  @ApiProperty({ description: '통화 ID' })
  id: string;

  @ApiProperty({ description: '발신자 전화번호' })
  callerNumber: string;

  @ApiProperty({ description: '수신자 전화번호', nullable: true })
  receiverNumber: string | null;

  @ApiProperty({
    description: '통화 상태',
    enum: CallStatusEnum,
  })
  status: CallStatusEnum;

  @ApiProperty({ description: 'WebRTC 세션 ID' })
  sessionId: string;

  @ApiProperty({ description: '통화 시작 시간', nullable: true })
  startedAt: Date | null;

  @ApiProperty({ description: '통화 종료 시간', nullable: true })
  endedAt: Date | null;

  @ApiProperty({ description: '통화 시간 (초)' })
  duration: number;

  @ApiProperty({ description: '대화 내용', type: [String] })
  transcript: string[];

  @ApiProperty({ description: '생성 시간' })
  createdAt: Date;

  @ApiProperty({ description: '수정 시간' })
  updatedAt: Date;

  /**
   * Convert domain entity to response DTO
   */
  static fromEntity(call: Call): CallResponseDto {
    return {
      id: call.id,
      callerNumber: call.callerNumber.value,
      receiverNumber: call.receiverNumber?.value || null,
      status: call.status.value,
      sessionId: call.sessionId,
      startedAt: call.startedAt,
      endedAt: call.endedAt,
      duration: call.duration,
      transcript: call.transcript,
      createdAt: call.createdAt,
      updatedAt: call.updatedAt,
    };
  }
}
