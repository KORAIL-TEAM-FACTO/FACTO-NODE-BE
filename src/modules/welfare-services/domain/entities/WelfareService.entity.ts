import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Region } from '../value-objects/Region.vo';

/**
 * Welfare Service Entity
 *
 * @description
 * - 복지 서비스 도메인 엔티티
 * - 공공데이터 포털에서 가져온 복지 서비스 정보 관리 (지자체 + 중앙부처)
 * - AI 요약 기능 포함
 */
@Entity('welfare_services')
export class WelfareService {
  @PrimaryColumn({ name: 'service_id', length: 50 })
  id: string;

  @Column({ name: 'service_type', length: 20, nullable: false, default: 'LOCAL' })
  serviceType: string; // 'LOCAL' or 'CENTRAL' or 'PRIVATE'

  @Column({ name: 'service_name', length: 500, nullable: false })
  serviceName: string;

  @Column({ name: 'service_summary', type: 'text', nullable: true })
  serviceSummary: string;

  @Column({ name: 'ai_summary', type: 'text', nullable: true })
  aiSummary: string;

  // 지자체 복지 서비스 필드 (중앙부처는 null)
  @Column({ name: 'ctpv_nm', length: 100, nullable: true })
  ctpvNm: string;

  @Column({ name: 'sgg_nm', length: 100, nullable: true })
  sggNm: string;

  @Column({ name: 'biz_chr_dept_nm', length: 200, nullable: true })
  bizChrDeptNm: string;

  @Column({ name: 'support_type', length: 100, nullable: true })
  supportType: string;

  @Column({ name: 'support_cycle', length: 100, nullable: true })
  supportCycle: string;

  @Column({ name: 'application_method', length: 100, nullable: true })
  applicationMethod: string;

  @Column({ name: 'life_cycle_array', type: 'text', nullable: true })
  lifeCycleArray: string;

  @Column({ name: 'target_array', type: 'text', nullable: true })
  targetArray: string;

  @Column({ name: 'interest_theme_array', type: 'text', nullable: true })
  interestThemeArray: string;

  @Column({ name: 'support_target_content', type: 'text', nullable: true })
  supportTargetContent: string;

  @Column({ name: 'selection_criteria', type: 'text', nullable: true })
  selectionCriteria: string;

  @Column({ name: 'service_content', type: 'text', nullable: true })
  serviceContent: string;

  @Column({ name: 'application_method_content', type: 'text', nullable: true })
  applicationMethodContent: string;

  @Column({ name: 'inquiry_count', type: 'int', default: 0 })
  inquiryCount: number;

  @Column({ name: 'detail_link', type: 'text', nullable: true })
  detailLink: string;

  @Column({ name: 'last_modified_date', length: 20, nullable: true })
  lastModifiedDate: string;

  // 중앙부처 복지 서비스 전용 필드 (지자체는 null)
  @Column({ name: 'service_url', type: 'text', nullable: true })
  serviceUrl: string;

  @Column({ name: 'site', type: 'text', nullable: true })
  site: string;

  @Column({ name: 'contact', type: 'text', nullable: true })
  contact: string;

  @Column({ name: 'department', length: 200, nullable: true })
  department: string;

  @Column({ name: 'organization', length: 200, nullable: true })
  organization: string;

  @Column({ name: 'base_year', type: 'int', nullable: true })
  baseYear: number;

  // 민간복지 서비스 전용 필드 (지자체/중앙부처는 null)
  @Column({ name: 'organization_name', length: 200, nullable: true })
  organizationName: string; // 기관명

  @Column({ name: 'project_start_date', length: 20, nullable: true })
  projectStartDate: string; // 사업시작일

  @Column({ name: 'project_end_date', length: 20, nullable: true })
  projectEndDate: string; // 사업종료일

  @Column({ name: 'required_documents', type: 'text', nullable: true })
  requiredDocuments: string; // 제출서류

  @Column({ name: 'etc', type: 'text', nullable: true })
  etc: string; // 기타

  @Column({ name: 'household_status', type: 'text', nullable: true })
  householdStatus: string; // 가구상황

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  /**
   * Factory method for creating new local welfare service (지자체)
   */
  static createLocal(data: {
    serviceId: string;
    serviceName: string;
    serviceSummary?: string;
    ctpvNm: string;
    sggNm?: string;
    bizChrDeptNm?: string;
    supportType?: string;
    supportCycle?: string;
    applicationMethod?: string;
    lifeCycleArray?: string;
    targetArray?: string;
    interestThemeArray?: string;
    supportTargetContent?: string;
    selectionCriteria?: string;
    serviceContent?: string;
    applicationMethodContent?: string;
    inquiryCount?: number;
    detailLink?: string;
    lastModifiedDate?: string;
  }): WelfareService {
    const service = new WelfareService();
    service.id = data.serviceId;
    service.serviceType = 'LOCAL';
    service.serviceName = data.serviceName;
    service.serviceSummary = data.serviceSummary || '';
    service.ctpvNm = data.ctpvNm;
    service.sggNm = data.sggNm || '';
    service.bizChrDeptNm = data.bizChrDeptNm || '';
    service.supportType = data.supportType || '';
    service.supportCycle = data.supportCycle || '';
    service.applicationMethod = data.applicationMethod || '';
    service.lifeCycleArray = data.lifeCycleArray || '';
    service.targetArray = data.targetArray || '';
    service.interestThemeArray = data.interestThemeArray || '';
    service.supportTargetContent = data.supportTargetContent || '';
    service.selectionCriteria = data.selectionCriteria || '';
    service.serviceContent = data.serviceContent || '';
    service.applicationMethodContent = data.applicationMethodContent || '';
    service.inquiryCount = data.inquiryCount || 0;
    service.detailLink = data.detailLink || '';
    service.lastModifiedDate = data.lastModifiedDate || '';
    service.aiSummary = '';
    return service;
  }

  /**
   * Factory method for creating new central welfare service (중앙부처)
   */
  static createCentral(data: {
    serviceId: string;
    serviceName: string;
    serviceSummary?: string;
    serviceUrl?: string;
    site?: string;
    contact?: string;
    department?: string;
    organization?: string;
    baseYear?: number;
    lastModifiedDate?: string;
  }): WelfareService {
    const service = new WelfareService();
    service.id = data.serviceId;
    service.serviceType = 'CENTRAL';
    service.serviceName = data.serviceName;
    service.serviceSummary = data.serviceSummary || '';
    service.serviceUrl = data.serviceUrl || '';
    service.site = data.site || '';
    service.contact = data.contact || '';
    service.department = data.department || '';
    service.organization = data.organization || '';
    service.baseYear = data.baseYear || 0;
    service.lastModifiedDate = data.lastModifiedDate || '';
    service.aiSummary = '';
    return service;
  }

  /**
   * Factory method for creating new private welfare service (민간)
   */
  static createPrivate(data: {
    serviceId: string;
    organizationName: string; // 기관명
    serviceName: string; // 사업명
    projectStartDate?: string; // 사업시작일
    projectEndDate?: string; // 사업종료일
    serviceSummary?: string; // 사업목적
    supportTargetContent?: string; // 지원대상
    serviceContent?: string; // 지원내용
    applicationMethodContent?: string; // 신청방법
    requiredDocuments?: string; // 제출서류
    etc?: string; // 기타
    lifeCycleArray?: string; // 생애주기
    householdStatus?: string; // 가구상황
    interestThemeArray?: string; // 관심주제
  }): WelfareService {
    const service = new WelfareService();
    service.id = data.serviceId;
    service.serviceType = 'PRIVATE';
    service.serviceName = data.serviceName;
    service.organizationName = data.organizationName;
    service.projectStartDate = data.projectStartDate || '';
    service.projectEndDate = data.projectEndDate || '';
    service.serviceSummary = data.serviceSummary || '';
    service.supportTargetContent = data.supportTargetContent || '';
    service.serviceContent = data.serviceContent || '';
    service.applicationMethodContent = data.applicationMethodContent || '';
    service.requiredDocuments = data.requiredDocuments || '';
    service.etc = data.etc || '';
    service.lifeCycleArray = data.lifeCycleArray || '';
    service.householdStatus = data.householdStatus || '';
    service.interestThemeArray = data.interestThemeArray || '';
    service.aiSummary = '';
    return service;
  }

  /**
   * Update AI summary
   */
  updateAiSummary(summary: string): void {
    if (!summary || summary.trim().length === 0) {
      throw new Error('AI 요약은 비어있을 수 없습니다');
    }
    this.aiSummary = summary;
  }

  /**
   * Increment inquiry count
   */
  incrementInquiryCount(): void {
    this.inquiryCount += 1;
  }

  /**
   * Get region (for local services only)
   */
  getRegion(): Region | null {
    if (this.serviceType === 'CENTRAL') return null;
    return Region.create(this.ctpvNm, this.sggNm);
  }
}
