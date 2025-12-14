import { ApiProperty } from '@nestjs/swagger';
import { WelfareService } from '../../../domain/entities/WelfareService.entity';

/**
 * Welfare Service Response DTO
 *
 * @description 복지 서비스 정보 응답 데이터
 */
export class WelfareServiceResponse {
  @ApiProperty({ description: '서비스 ID' })
  id: string;

  @ApiProperty({ description: '서비스 구분 (LOCAL/CENTRAL)' })
  serviceType: string;

  @ApiProperty({ description: '서비스 이름' })
  serviceName: string;

  @ApiProperty({ description: '서비스 요약' })
  serviceSummary: string;

  @ApiProperty({ description: 'AI 생성 요약', nullable: true })
  aiSummary: string | null;

  @ApiProperty({ description: '시도명 (지자체만)', nullable: true })
  ctpvNm: string | null;

  @ApiProperty({ description: '시군구명 (지자체만)', nullable: true })
  sggNm: string | null;

  @ApiProperty({ description: '담당 부서', nullable: true })
  bizChrDeptNm: string;

  @ApiProperty({ description: '지원 유형', nullable: true })
  supportType: string;

  @ApiProperty({ description: '지원 주기', nullable: true })
  supportCycle: string;

  @ApiProperty({ description: '신청 방법', nullable: true })
  applicationMethod: string;

  @ApiProperty({ description: '생애주기', nullable: true })
  lifeCycleArray: string;

  @ApiProperty({ description: '대상자', nullable: true })
  targetArray: string;

  @ApiProperty({ description: '관심주제', nullable: true })
  interestThemeArray: string;

  @ApiProperty({ description: '지원 대상 내용', nullable: true })
  supportTargetContent: string;

  @ApiProperty({ description: '선정 기준', nullable: true })
  selectionCriteria: string;

  @ApiProperty({ description: '서비스 내용', nullable: true })
  serviceContent: string;

  @ApiProperty({ description: '신청 방법 내용', nullable: true })
  applicationMethodContent: string;

  @ApiProperty({ description: '조회 수' })
  inquiryCount: number;

  @ApiProperty({ description: '상세 링크', nullable: true })
  detailLink: string;

  @ApiProperty({ description: '최종 수정일', nullable: true })
  lastModifiedDate: string;

  @ApiProperty({ description: '서비스 URL (중앙부처만)', nullable: true })
  serviceUrl: string | null;

  @ApiProperty({ description: '사이트 (중앙부처만)', nullable: true })
  site: string | null;

  @ApiProperty({ description: '대표 문의 (중앙부처만)', nullable: true })
  contact: string | null;

  @ApiProperty({ description: '소관부처명 (중앙부처만)', nullable: true })
  department: string | null;

  @ApiProperty({ description: '소관조직명 (중앙부처만)', nullable: true })
  organization: string | null;

  @ApiProperty({ description: '기준연도 (중앙부처만)', nullable: true })
  baseYear: number | null;

  @ApiProperty({ description: '생성일' })
  createdAt: Date;

  @ApiProperty({ description: '수정일' })
  updatedAt: Date;

  /**
   * Convert domain entity to response DTO
   */
  static fromEntity(service: WelfareService): WelfareServiceResponse {
    return {
      id: service.id,
      serviceType: service.serviceType,
      serviceName: service.serviceName,
      serviceSummary: service.serviceSummary,
      aiSummary: service.aiSummary,
      ctpvNm: service.ctpvNm || null,
      sggNm: service.sggNm || null,
      bizChrDeptNm: service.bizChrDeptNm,
      supportType: service.supportType,
      supportCycle: service.supportCycle,
      applicationMethod: service.applicationMethod,
      lifeCycleArray: service.lifeCycleArray,
      targetArray: service.targetArray,
      interestThemeArray: service.interestThemeArray,
      supportTargetContent: service.supportTargetContent,
      selectionCriteria: service.selectionCriteria,
      serviceContent: service.serviceContent,
      applicationMethodContent: service.applicationMethodContent,
      inquiryCount: service.inquiryCount,
      detailLink: service.detailLink,
      lastModifiedDate: service.lastModifiedDate,
      serviceUrl: service.serviceUrl || null,
      site: service.site || null,
      contact: service.contact || null,
      department: service.department || null,
      organization: service.organization || null,
      baseYear: service.baseYear || null,
      createdAt: service.createdAt,
      updatedAt: service.updatedAt,
    };
  }
}
