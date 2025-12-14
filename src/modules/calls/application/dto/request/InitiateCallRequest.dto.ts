import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, Matches } from 'class-validator';

/**
 * Initiate Call Request DTO
 *
 * @description 통화 시작 요청 데이터
 */
export class InitiateCallRequestDto {
  @ApiProperty({
    description: '발신자 전화번호',
    example: '01012345678',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^(\+?\d{10,15})$/, {
    message: '올바른 전화번호 형식이 아닙니다',
  })
  callerNumber: string;

  @ApiProperty({
    description: '수신자 전화번호 (선택)',
    example: '01087654321',
    required: false,
  })
  @IsString()
  @IsOptional()
  @Matches(/^(\+?\d{10,15})$/, {
    message: '올바른 전화번호 형식이 아닙니다',
  })
  receiverNumber?: string;
}
