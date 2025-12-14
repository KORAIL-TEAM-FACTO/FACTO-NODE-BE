import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { IWelfareServiceRepository } from '../../domain/repositories/WelfareServiceRepository.interface';
import { WelfareService } from '../../domain/entities/WelfareService.entity';

/**
 * Welfare Service Repository Implementation
 *
 * @description TypeORM을 사용한 복지 서비스 리포지토리 구현
 */
@Injectable()
export class WelfareServiceRepository implements IWelfareServiceRepository {
  constructor(
    @InjectRepository(WelfareService)
    private readonly repository: Repository<WelfareService>,
  ) {}

  async findById(id: string): Promise<WelfareService | null> {
    return this.repository.findOne({ where: { id } });
  }

  async findByRegion(ctpvNm: string, sggNm?: string): Promise<WelfareService[]> {
    const query = this.repository.createQueryBuilder('ws').where('ws.ctpv_nm = :ctpvNm', {
      ctpvNm,
    });

    if (sggNm) {
      query.andWhere('ws.sgg_nm = :sggNm', { sggNm });
    }

    return query.getMany();
  }

  async findAll(
    page: number = 1,
    limit: number = 20,
  ): Promise<{ data: WelfareService[]; total: number }> {
    const [data, total] = await this.repository.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
      order: {
        createdAt: 'DESC',
      },
    });

    return { data, total };
  }

  /**
   * Search welfare services by keyword
   * - Searches in service_name and ai_summary fields
   * - Uses OR condition for broader results
   * - Orders by inquiry_count (more popular first)
   */
  async searchByKeyword(keyword: string, limit: number = 5): Promise<WelfareService[]> {
    return this.repository
      .createQueryBuilder('ws')
      .where('ws.service_name LIKE :keyword', { keyword: `%${keyword}%` })
      .orWhere('ws.ai_summary LIKE :keyword', { keyword: `%${keyword}%` })
      .orderBy('ws.inquiry_count', 'DESC') // 조회수가 많은 것 우선
      .addOrderBy('ws.created_at', 'DESC') // 최신 것 우선
      .limit(limit)
      .getMany();
  }

  async save(service: WelfareService): Promise<WelfareService> {
    return this.repository.save(service);
  }

  async saveMany(services: WelfareService[]): Promise<WelfareService[]> {
    return this.repository.save(services);
  }

  async update(service: WelfareService): Promise<WelfareService> {
    return this.repository.save(service);
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  async exists(id: string): Promise<boolean> {
    const count = await this.repository.count({ where: { id } });
    return count > 0;
  }
}
