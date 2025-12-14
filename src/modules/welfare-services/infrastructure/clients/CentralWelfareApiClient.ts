import { Injectable, Logger, Inject } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { ApiRequestFailedException } from '../../domain/exceptions/ApiRequestFailedException';
import { RateLimitExceededException } from '../../domain/exceptions/RateLimitExceededException';
import type { IApiCacheRepository } from '../../domain/repositories/ApiCacheRepository.interface';
import { API_CACHE_REPOSITORY } from '../../domain/repositories/ApiCacheRepository.interface';
import { CacheKey } from '../../domain/value-objects/CacheKey.vo';
import { ApiCache } from '../../domain/entities/ApiCache.entity';

/**
 * 중앙부처 복지서비스 응답 인터페이스
 */
interface CentralWelfareResponse {
  page: number;
  perPage: number;
  totalCount: number;
  currentCount: number;
  matchCount: number;
  data: CentralWelfareItem[];
}

/**
 * 중앙부처 복지서비스 항목 인터페이스
 */
export interface CentralWelfareItem {
  서비스아이디: string;
  서비스명: string;
  서비스URL: string;
  서비스요약: string;
  사이트: string;
  대표문의: string;
  소관부처명: string;
  소관조직명: string;
  기준연도: number;
  최종수정일: string;
}

/**
 * Central Welfare API Client
 *
 * @description
 * - 한국사회보장정보원 중앙부처 복지서비스 조회 클라이언트
 * - JSON 응답을 파싱하여 객체로 변환
 * - 지역과 상관없이 전국민이 받을 수 있는 복지 서비스 제공
 */
@Injectable()
export class CentralWelfareApiClient {
  private readonly logger = new Logger(CentralWelfareApiClient.name);
  private readonly baseUrl: string;
  private readonly serviceKey: string;
  private readonly resourceId: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    @Inject(API_CACHE_REPOSITORY)
    private readonly cacheRepository: IApiCacheRepository,
  ) {
    this.baseUrl = this.configService.get<string>(
      'CENTRAL_WELFARE_BASE_URL',
      'https://api.odcloud.kr/api',
    );
    this.serviceKey = this.configService.get<string>('CENTRAL_WELFARE_SERVICE_KEY', '');
    // 최신 버전 엔드포인트 (20250722)
    this.resourceId = this.configService.get<string>(
      'CENTRAL_WELFARE_RESOURCE_ID',
      'uddi:3929b807-3420-44d7-a851-cc741fce65a1',
    );
  }

  /**
   * 중앙부처 복지서비스 목록 조회
   *
   * @param options - 조회 옵션
   * @returns 중앙부처 복지서비스 목록
   */
  async getCentralWelfareList(options: {
    page?: number;
    perPage?: number;
  } = {}): Promise<CentralWelfareItem[]> {
    const page = options.page || 1;
    const perPage = options.perPage || 100;

    const url = `${this.baseUrl}/15083323/v1/${this.resourceId}`;
    const params = {
      page: String(page),
      perPage: String(perPage),
      serviceKey: this.serviceKey,
    };

    // 캐시 키 생성
    const cacheKey = CacheKey.fromUrlAndParams(url, params);

    // 캐시 조회
    const cachedData = await this.cacheRepository.findByCacheKey(cacheKey);
    if (cachedData) {
      this.logger.log(`Cache hit for central welfare list (TTL: ${cachedData.getRemainingTtl()}s)`);
      return cachedData.getParsedResponseData();
    }

    try {
      this.logger.log(`Fetching central welfare list: page=${page}, perPage=${perPage}`);

      const response = await firstValueFrom(
        this.httpService.get<CentralWelfareResponse>(url, { params }),
      );

      if (!response.data || !response.data.data) {
        throw new ApiRequestFailedException('Invalid response format from central welfare API');
      }

      const result = response.data.data;
      this.logger.log(`Fetched ${result.length} central welfare services`);

      // 캐시 저장 (TTL 100시간 = 360000초)
      const cache = ApiCache.create(cacheKey, result, 360000);
      await this.cacheRepository.save(cache);
      this.logger.log(`Cached central welfare list (TTL: 100 hours)`);

      return result;
    } catch (error) {
      // 429 에러 감지
      if (error.response?.status === 429) {
        this.logger.error(`Rate limit exceeded for central welfare list: ${error.message}`);
        throw new RateLimitExceededException('중앙부처 복지 API', error.response?.data);
      }
      this.logger.error(`Failed to fetch central welfare list: ${error.message}`);
      throw new ApiRequestFailedException(error.message);
    }
  }

  /**
   * 모든 중앙부처 복지서비스 데이터 가져오기 (페이지네이션)
   *
   * @returns 전체 중앙부처 복지서비스 목록
   */
  async getAllCentralWelfareServices(): Promise<CentralWelfareItem[]> {
    const allServices: CentralWelfareItem[] = [];
    let page = 1;
    const perPage = 100;
    let hasMore = true;

    while (hasMore) {
      this.logger.log(`Fetching central welfare page ${page}...`);
      const services = await this.getCentralWelfareList({ page, perPage });

      if (services.length === 0) {
        hasMore = false;
      } else {
        allServices.push(...services);

        // 마지막 페이지 체크 (perPage보다 적게 받으면 마지막)
        if (services.length < perPage) {
          hasMore = false;
        } else {
          page += 1;
        }
      }

      // Safety limit
      if (page > 100) {
        this.logger.warn('Reached page limit of 100 for central welfare');
        break;
      }
    }

    this.logger.log(`Fetched total of ${allServices.length} central welfare services`);
    return allServices;
  }
}
