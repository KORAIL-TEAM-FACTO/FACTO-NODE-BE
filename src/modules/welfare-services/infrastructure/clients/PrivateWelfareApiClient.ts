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

interface PrivateWelfareItem {
  기관명: string;
  사업명: string;
  사업시작일: string;
  사업종료일: string;
  사업목적: string;
  지원대상: string;
  지원내용: string;
  신청방법: string;
  제출서류: string;
  기타: string;
  생애주기: string;
  가구상황: string;
  관심주제: string;
}

interface PrivateWelfareListResponse {
  page: number;
  perPage: number;
  totalCount: number;
  currentCount: number;
  matchCount: number;
  data: PrivateWelfareItem[];
}

/**
 * Private Welfare API Client
 *
 * @description
 * - 한국사회보장정보원 민간복지서비스 조회 클라이언트
 * - JSON 응답을 파싱하여 객체로 변환
 */
@Injectable()
export class PrivateWelfareApiClient {
  private readonly logger = new Logger(PrivateWelfareApiClient.name);
  private readonly baseUrl: string;
  private readonly serviceKey: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    @Inject(API_CACHE_REPOSITORY)
    private readonly cacheRepository: IApiCacheRepository,
  ) {
    this.baseUrl = this.configService.get<string>(
      'PRIVATE_WELFARE_BASE_URL',
      'https://api.odcloud.kr/api',
    );
    this.serviceKey = this.configService.get<string>('PRIVATE_WELFARE_SERVICE_KEY', '');
  }

  /**
   * 민간복지서비스 목록 조회 (페이지네이션)
   *
   * @param options - 조회 옵션
   * @returns 민간복지서비스 목록
   */
  async getPrivateWelfareList(options: {
    page?: number;
    perPage?: number;
  } = {}): Promise<PrivateWelfareItem[]> {
    const page = options.page || 1;
    const perPage = options.perPage || 100;

    const url = `${this.baseUrl}/15116392/v1/uddi:e42c15c4-d478-4210-922f-fb32233dc8f6`;
    const params = {
      serviceKey: this.serviceKey,
      page: String(page),
      perPage: String(perPage),
    };

    // 캐시 키 생성
    const cacheKey = CacheKey.fromUrlAndParams(url, params);

    // 캐시 조회
    const cachedData = await this.cacheRepository.findByCacheKey(cacheKey);
    if (cachedData) {
      this.logger.log(`Cache hit for private welfare list (TTL: ${cachedData.getRemainingTtl()}s)`);
      return cachedData.getParsedResponseData();
    }

    try {
      this.logger.log(`Fetching private welfare list page ${page} (${perPage} per page)...`);

      // 최신 데이터셋 사용: uddi:e42c15c4-d478-4210-922f-fb32233dc8f6 (20251105)
      const response = await firstValueFrom(
        this.httpService.get<PrivateWelfareListResponse>(url, { params }),
      );

      const data = response.data;

      if (!data.data || data.data.length === 0) {
        this.logger.log(`No more data at page ${page}`);
        return [];
      }

      const result = data.data;
      this.logger.log(`Fetched ${result.length} private welfare services (page ${page})`);

      // 캐시 저장 (TTL 100시간 = 360000초)
      const cache = ApiCache.create(cacheKey, result, 360000);
      await this.cacheRepository.save(cache);
      this.logger.log(`Cached private welfare list (TTL: 100 hours)`);

      return result;
    } catch (error) {
      // 429 에러 감지
      if (error.response?.status === 429) {
        this.logger.error(`Rate limit exceeded for private welfare list: ${error.message}`);
        throw new RateLimitExceededException('민간 복지 API', error.response?.data);
      }

      // 400 에러는 페이지가 범위를 벗어난 경우 (더 이상 데이터 없음)
      if (error.response?.status === 400) {
        this.logger.warn(`Page ${page} is out of range (400 Bad Request). Returning empty array.`);
        return [];
      }

      this.logger.error(`Failed to fetch private welfare list: ${error.message}`);
      throw new ApiRequestFailedException(error.message);
    }
  }

  /**
   * 모든 민간복지서비스 데이터 가져오기 (페이지네이션)
   *
   * @returns 전체 민간복지서비스 목록
   */
  async getAllPrivateWelfareServices(): Promise<PrivateWelfareItem[]> {
    const allServices: PrivateWelfareItem[] = [];
    let page = 1;
    const perPage = 100;
    let hasMore = true;

    while (hasMore) {
      this.logger.log(`Fetching page ${page}...`);
      const services = await this.getPrivateWelfareList({ page, perPage });

      if (services.length === 0) {
        hasMore = false;
      } else {
        allServices.push(...services);
        page += 1;
      }

      // Safety limit to prevent infinite loops
      if (page > 100) {
        this.logger.warn('Reached page limit of 100');
        break;
      }
    }

    this.logger.log(`Fetched total of ${allServices.length} private welfare services`);
    return allServices;
  }
}
