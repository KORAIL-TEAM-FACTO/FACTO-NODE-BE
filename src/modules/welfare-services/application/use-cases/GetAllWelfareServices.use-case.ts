import { Injectable, Inject } from '@nestjs/common';
import type { IWelfareServiceRepository } from '../../domain/repositories/WelfareServiceRepository.interface';
import { WELFARE_SERVICE_REPOSITORY } from '../../domain/repositories/WelfareServiceRepository.interface';
import { WelfareService } from '../../domain/entities/WelfareService.entity';

/**
 * Get All Welfare Services Use Case
 *
 * @description 복지 서비스 목록 조회 (페이지네이션)
 */
@Injectable()
export class GetAllWelfareServicesUseCase {
  constructor(
    @Inject(WELFARE_SERVICE_REPOSITORY)
    private readonly repository: IWelfareServiceRepository,
  ) {}

  /**
   * 복지 서비스 목록 조회
   *
   * @param page - 페이지 번호
   * @param limit - 페이지당 항목 수
   * @returns 복지 서비스 목록 및 총 개수
   */
  async execute(
    page: number = 1,
    limit: number = 20,
  ): Promise<{ data: WelfareService[]; total: number; page: number; totalPages: number }> {
    const { data, total } = await this.repository.findAll(page, limit);

    return {
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }
}
