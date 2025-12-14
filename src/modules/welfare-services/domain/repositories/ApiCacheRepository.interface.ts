import { ApiCache } from '../entities/ApiCache.entity';
import { CacheKey } from '../value-objects/CacheKey.vo';

/**
 * API Cache Repository Interface
 *
 * @description API 캐시 데이터 접근 인터페이스
 */
export interface IApiCacheRepository {
  /**
   * 캐시 키로 캐시 조회
   *
   * @param cacheKey - 캐시 키
   * @returns ApiCache 또는 null
   */
  findByCacheKey(cacheKey: CacheKey): Promise<ApiCache | null>;

  /**
   * 캐시 저장
   *
   * @param cache - ApiCache 엔티티
   * @returns 저장된 ApiCache
   */
  save(cache: ApiCache): Promise<ApiCache>;

  /**
   * 만료된 캐시 삭제
   *
   * @returns 삭제된 캐시 개수
   */
  deleteExpired(): Promise<number>;

  /**
   * 모든 캐시 삭제
   */
  deleteAll(): Promise<void>;
}

export const API_CACHE_REPOSITORY = Symbol('API_CACHE_REPOSITORY');
