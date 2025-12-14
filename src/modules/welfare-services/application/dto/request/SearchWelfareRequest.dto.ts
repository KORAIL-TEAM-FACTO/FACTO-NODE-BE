import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsNotEmpty } from 'class-validator';

/**
 * Search Welfare Request DTO
 *
 * @description 복지 서비스 검색 요청 데이터
 */
export class SearchWelfareRequest {
  @ApiProperty({
    description: '시도명',
    example: '서울특별시',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  ctpvNm: string;

  @ApiProperty({
    description: '시군구명',
    example: '강남구',
    required: false,
  })
  @IsString()
  @IsOptional()
  sggNm?: string;
}
