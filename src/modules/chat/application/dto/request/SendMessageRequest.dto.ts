import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';

/**
 * Send Message Request DTO
 *
 * @description 메시지 전송 요청 데이터
 */
export class SendMessageRequest {
  @ApiProperty({
    description: '세션 ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsString()
  @IsNotEmpty()
  sessionId: string;

  @ApiProperty({
    description: '메시지 내용',
    example: '안녕하세요',
  })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty({
    description: '메시지 타입',
    enum: ['TEXT', 'AUDIO'],
    default: 'TEXT',
    required: false,
  })
  @IsEnum(['TEXT', 'AUDIO'])
  @IsOptional()
  messageType?: 'TEXT' | 'AUDIO';
}
