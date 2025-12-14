import { WelfareService } from '../entities/WelfareService.entity';

/**
 * Welfare Service Repository Interface
 *
 * @description 복지 서비스 데이터 접근 인터페이스
 */
export interface IWelfareServiceRepository {
  findById(id: string): Promise<WelfareService | null>;
  findByRegion(ctpvNm: string, sggNm?: string): Promise<WelfareService[]>;
  findAll(page: number, limit: number): Promise<{ data: WelfareService[]; total: number }>;
  save(service: WelfareService): Promise<WelfareService>;
  saveMany(services: WelfareService[]): Promise<WelfareService[]>;
  update(service: WelfareService): Promise<WelfareService>;
  delete(id: string): Promise<void>;
  exists(id: string): Promise<boolean>;
}

export const WELFARE_SERVICE_REPOSITORY = Symbol('WELFARE_SERVICE_REPOSITORY');
