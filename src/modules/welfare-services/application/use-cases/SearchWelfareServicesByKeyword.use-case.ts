import { Injectable, Inject, Logger } from '@nestjs/common';
import type { IWelfareServiceRepository } from '../../domain/repositories/WelfareServiceRepository.interface';
import { WELFARE_SERVICE_REPOSITORY } from '../../domain/repositories/WelfareServiceRepository.interface';
import { WelfareServiceResponse } from '../dto/response/WelfareServiceResponse.dto';

/**
 * Search Welfare Services By Keyword Use Case
 *
 * @description
 * - AI가 사용자 질문에서 키워드를 추출하여 복지 서비스 검색
 * - service_name과 ai_summary에서 LIKE 검색
 * - 검색 결과를 relevance 순으로 정렬
 */
@Injectable()
export class SearchWelfareServicesByKeywordUseCase {
  private readonly logger = new Logger(SearchWelfareServicesByKeywordUseCase.name);

  constructor(
    @Inject(WELFARE_SERVICE_REPOSITORY)
    private readonly welfareServiceRepository: IWelfareServiceRepository,
  ) {}

  /**
   * Execute keyword search
   *
   * @param keyword - 검색 키워드 (예: "장애인", "노인", "아동")
   * @param limit - 최대 결과 수 (기본 5개)
   * @returns 검색된 복지 서비스 목록
   */
  async execute(keyword: string, limit: number = 5): Promise<WelfareServiceResponse[]> {
    this.logger.log(`Searching welfare services by keyword: "${keyword}" (limit: ${limit})`);

    if (!keyword || keyword.trim().length === 0) {
      this.logger.warn('Empty keyword provided');
      return [];
    }

    // 키워드로 검색 (service_name 또는 ai_summary에서 LIKE 검색)
    const services = await this.welfareServiceRepository.searchByKeyword(
      keyword.trim(),
      limit,
    );

    this.logger.log(`Found ${services.length} services for keyword: "${keyword}"`);

    // DTO로 변환
    return services.map((service) => WelfareServiceResponse.fromEntity(service));
  }
}
