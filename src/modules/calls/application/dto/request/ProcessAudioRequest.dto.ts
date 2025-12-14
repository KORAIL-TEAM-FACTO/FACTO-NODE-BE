import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

/**
 * Process Audio Request DTO
 *
 * @description 오디오 처리 요청 데이터
 */
export class ProcessAudioRequestDto {
  @ApiProperty({
    description: '통화 ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsString()
  @IsNotEmpty()
  callId: string;

  @ApiProperty({
    description: 'AI 시스템 프롬프트 (선택)',
    example: '당신은 친절한 고객 서비스 담당자입니다.',
    required: false,
  })
  @IsString()
  @IsOptional()
  systemPrompt?: string;
}
