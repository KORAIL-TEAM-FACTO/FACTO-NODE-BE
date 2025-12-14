import { ApiProperty } from '@nestjs/swagger';

/**
 * AI Conversation Response DTO
 *
 * @description AI 대화 처리 응답 데이터
 */
export class AIConversationResponseDto {
  @ApiProperty({ description: '사용자 메시지 (변환된 텍스트)' })
  userMessage: string;

  @ApiProperty({ description: 'AI 응답 메시지' })
  aiResponse: string;

  @ApiProperty({
    description: '감정 분석 결과',
    required: false,
  })
  sentiment?: {
    sentiment: 'positive' | 'neutral' | 'negative';
    score: number;
  };

  @ApiProperty({ description: '응답 생성 시간' })
  timestamp: string;
}
