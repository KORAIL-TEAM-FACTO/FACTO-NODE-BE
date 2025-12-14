import { Injectable, Inject } from '@nestjs/common';
import type { IWelfareServiceRepository } from '../../domain/repositories/WelfareServiceRepository.interface';
import { WELFARE_SERVICE_REPOSITORY } from '../../domain/repositories/WelfareServiceRepository.interface';
import { WelfareService } from '../../domain/entities/WelfareService.entity';
import { WelfareServiceNotFoundException } from '../../domain/exceptions/WelfareServiceNotFoundException';

/**
 * Get Welfare Service Use Case
 *
 * @description 복지 서비스 상세 조회
 */
@Injectable()
export class GetWelfareServiceUseCase {
  constructor(
    @Inject(WELFARE_SERVICE_REPOSITORY)
    private readonly repository: IWelfareServiceRepository,
  ) {}

  /**
   * 복지 서비스 조회
   *
   * @param serviceId - 서비스 ID
   * @returns 복지 서비스 엔티티
   * @throws {WelfareServiceNotFoundException} 서비스를 찾을 수 없을 때
   */
  async execute(serviceId: string): Promise<WelfareService> {
    const service = await this.repository.findById(serviceId);

    if (!service) {
      throw new WelfareServiceNotFoundException(serviceId);
    }

    // Increment inquiry count
    service.incrementInquiryCount();
    await this.repository.update(service);

    return service;
  }
}
