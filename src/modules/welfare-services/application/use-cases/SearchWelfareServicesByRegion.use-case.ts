import { Injectable, Inject } from '@nestjs/common';
import type { IWelfareServiceRepository } from '../../domain/repositories/WelfareServiceRepository.interface';
import { WELFARE_SERVICE_REPOSITORY } from '../../domain/repositories/WelfareServiceRepository.interface';
import { WelfareService } from '../../domain/entities/WelfareService.entity';

/**
 * Search Welfare Services By Region Use Case
 *
 * @description 지역별 복지 서비스 검색
 */
@Injectable()
export class SearchWelfareServicesByRegionUseCase {
  constructor(
    @Inject(WELFARE_SERVICE_REPOSITORY)
    private readonly repository: IWelfareServiceRepository,
  ) {}

  /**
   * 지역별 복지 서비스 검색
   *
   * @param ctpvNm - 시도명
   * @param sggNm - 시군구명 (선택)
   * @returns 복지 서비스 목록
   */
  async execute(ctpvNm: string, sggNm?: string): Promise<WelfareService[]> {
    return this.repository.findByRegion(ctpvNm, sggNm);
  }
}
