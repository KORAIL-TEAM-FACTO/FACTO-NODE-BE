import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import type { IApiCacheRepository } from '../../domain/repositories/ApiCacheRepository.interface';
import { ApiCache } from '../../domain/entities/ApiCache.entity';
import { CacheKey } from '../../domain/value-objects/CacheKey.vo';

/**
 * API Cache Repository Implementation
 *
 * @description TypeORM을 사용한 API 캐시 리포지토리 구현
 */
@Injectable()
export class ApiCacheRepository implements IApiCacheRepository {
  private readonly logger = new Logger(ApiCacheRepository.name);

  constructor(
    @InjectRepository(ApiCache)
    private readonly repository: Repository<ApiCache>,
  ) {}

  /**
   * 캐시 키로 캐시 조회
   *
   * @param cacheKey - 캐시 키
   * @returns 유효한 ApiCache 또는 null
   */
  async findByCacheKey(cacheKey: CacheKey): Promise<ApiCache | null> {
    try {
      const cache = await this.repository.findOne({
        where: { cacheKey: cacheKey.value },
      });

      if (!cache) {
        this.logger.debug(`Cache miss: ${cacheKey.value}`);
        return null;
      }

      // 만료된 캐시 확인
      if (cache.isExpired()) {
        this.logger.debug(`Cache expired: ${cacheKey.value}`);
        // 만료된 캐시 삭제
        await this.repository.delete({ cacheKey: cacheKey.value });
        return null;
      }

      this.logger.debug(`Cache hit: ${cacheKey.value} (TTL: ${cache.getRemainingTtl()}s)`);
      return cache;
    } catch (error) {
      this.logger.error(`Failed to find cache: ${error.message}`);
      return null;
    }
  }

  /**
   * 캐시 저장 (Upsert)
   *
   * @param cache - ApiCache 엔티티
   * @returns 저장된 ApiCache
   */
  async save(cache: ApiCache): Promise<ApiCache> {
    try {
      // 기존 캐시가 있으면 삭제 후 새로 저장
      await this.repository.delete({ cacheKey: cache.cacheKey });

      const saved = await this.repository.save(cache);
      this.logger.debug(`Cache saved: ${cache.cacheKey} (TTL: ${cache.ttlSeconds}s)`);
      return saved;
    } catch (error) {
      this.logger.error(`Failed to save cache: ${error.message}`);
      throw error;
    }
  }

  /**
   * 만료된 캐시 삭제
   *
   * @returns 삭제된 캐시 개수
   */
  async deleteExpired(): Promise<number> {
    try {
      // TTL이 지난 캐시들 찾기
      const expiredCaches = await this.repository
        .createQueryBuilder('cache')
        .where('TIMESTAMPDIFF(SECOND, cache.created_at, NOW()) > cache.ttl_seconds')
        .getMany();

      if (expiredCaches.length === 0) {
        return 0;
      }

      const expiredKeys = expiredCaches.map((c) => c.cacheKey);
      await this.repository.delete({ cacheKey: In(expiredKeys) });

      this.logger.log(`Deleted ${expiredCaches.length} expired caches`);
      return expiredCaches.length;
    } catch (error) {
      this.logger.error(`Failed to delete expired caches: ${error.message}`);
      return 0;
    }
  }

  /**
   * 모든 캐시 삭제
   */
  async deleteAll(): Promise<void> {
    try {
      await this.repository.clear();
      this.logger.log('All caches cleared');
    } catch (error) {
      this.logger.error(`Failed to clear all caches: ${error.message}`);
      throw error;
    }
  }
}
