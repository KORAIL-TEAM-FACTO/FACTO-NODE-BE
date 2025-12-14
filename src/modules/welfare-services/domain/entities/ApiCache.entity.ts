import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';
import { CacheKey } from '../value-objects/CacheKey.vo';

/**
 * API Cache Entity
 *
 * @description
 * - 외부 API 응답을 캐싱하는 엔티티
 * - TTL 1시간 설정 (3600초)
 * - 캐시 히트율을 높여 API 호출 최적화
 *
 * @example
 * const cache = ApiCache.create(cacheKey, responseData);
 * const isValid = cache.isValid();
 */
@Entity('api_cache')
export class ApiCache {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'cache_key', type: 'varchar', length: 500, unique: true })
  cacheKey: string;

  @Column({ name: 'response_data', type: 'longtext' })
  responseData: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @Column({ name: 'ttl_seconds', type: 'int', default: 3600 })
  ttlSeconds: number;

  // Private constructor
  private constructor() {}

  // Helper methods
  getCacheKey(): CacheKey {
    return CacheKey.create(this.cacheKey);
  }

  getParsedResponseData(): any {
    try {
      return JSON.parse(this.responseData);
    } catch {
      return this.responseData;
    }
  }

  getExpiresAt(): Date {
    return new Date(this.createdAt.getTime() + this.ttlSeconds * 1000);
  }

  /**
   * Factory method for creating new cache entry
   *
   * @param cacheKey - 캐시 키
   * @param responseData - 응답 데이터
   * @param ttlSeconds - TTL (초 단위, 기본값: 3600초 = 1시간)
   * @returns 새로운 ApiCache 엔티티
   */
  static create(cacheKey: CacheKey, responseData: any, ttlSeconds: number = 3600): ApiCache {
    const cache = new ApiCache();
    cache.cacheKey = cacheKey.value;
    cache.responseData = typeof responseData === 'string'
      ? responseData
      : JSON.stringify(responseData);
    cache.ttlSeconds = ttlSeconds;
    return cache;
  }

  /**
   * 캐시가 유효한지 확인
   *
   * @returns 캐시가 TTL 내에 있으면 true
   */
  isValid(): boolean {
    const now = new Date();
    return now < this.getExpiresAt();
  }

  /**
   * 캐시가 만료되었는지 확인
   *
   * @returns 캐시가 만료되었으면 true
   */
  isExpired(): boolean {
    return !this.isValid();
  }

  /**
   * 남은 TTL 초 계산
   *
   * @returns 남은 TTL (초), 만료되었으면 0
   */
  getRemainingTtl(): number {
    if (this.isExpired()) {
      return 0;
    }
    const now = new Date();
    return Math.floor((this.getExpiresAt().getTime() - now.getTime()) / 1000);
  }
}
