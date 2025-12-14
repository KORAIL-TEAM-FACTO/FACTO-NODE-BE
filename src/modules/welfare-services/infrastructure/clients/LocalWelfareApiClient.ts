import { Injectable, Logger, Inject } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { parseString } from 'xml2js';
import { promisify } from 'util';
import { ApiRequestFailedException } from '../../domain/exceptions/ApiRequestFailedException';
import { RateLimitExceededException } from '../../domain/exceptions/RateLimitExceededException';
import type { IApiCacheRepository } from '../../domain/repositories/ApiCacheRepository.interface';
import { API_CACHE_REPOSITORY } from '../../domain/repositories/ApiCacheRepository.interface';
import { CacheKey } from '../../domain/value-objects/CacheKey.vo';
import { ApiCache } from '../../domain/entities/ApiCache.entity';

const parseXml = promisify(parseString);

interface WelfareListItem {
  servId: string[];
  servNm: string[];
  servDgst?: string[];
  ctpvNm?: string[];
  sggNm?: string[];
  bizChrDeptNm?: string[];
  srvPvsnNm?: string[];
  sprtCycNm?: string[];
  aplyMtdNm?: string[];
  lifeNmArray?: string[];
  trgterIndvdlNmArray?: string[];
  intrsThemaNmArray?: string[];
  inqNum?: string[];
  servDtlLink?: string[];
  lastModYmd?: string[];
}

interface WelfareDetailResponse {
  servId: string;
  servNm: string;
  servDgst?: string;
  ctpvNm?: string;
  sggNm?: string;
  bizChrDeptNm?: string;
  srvPvsnNm?: string;
  sprtCycNm?: string;
  aplyMtdNm?: string;
  lifeNmArray?: string;
  trgterIndvdlNmArray?: string;
  intrsThemaNmArray?: string;
  sprtTrgtCn?: string;
  slctCritCn?: string;
  alwServCn?: string;
  aplyMtdCn?: string;
  inqNum?: string;
  lastModYmd?: string;
}

/**
 * Local Welfare API Client
 *
 * @description
 * - 한국사회보장정보원 지자체 복지서비스 조회 클라이언트
 * - XML 응답을 파싱하여 객체로 변환
 */
@Injectable()
export class LocalWelfareApiClient {
  private readonly logger = new Logger(LocalWelfareApiClient.name);
  private readonly baseUrl: string;
  private readonly serviceKey: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    @Inject(API_CACHE_REPOSITORY)
    private readonly cacheRepository: IApiCacheRepository,
  ) {
    this.baseUrl = this.configService.get<string>(
      'LOCAL_WELFARE_BASE_URL',
      'https://apis.data.go.kr/B554287/LocalGovernmentWelfareInformations',
    );
    this.serviceKey = this.configService.get<string>('LOCAL_WELFARE_SERVICE_KEY', '');
  }

  /**
   * 복지서비스 목록 조회
   *
   * @param options - 조회 옵션
   * @returns 복지서비스 목록
   */
  async getWelfareList(options: {
    pageNo?: number;
    numOfRows?: number;
    ctpvNm?: string;
    sggNm?: string;
  } = {}): Promise<WelfareListItem[]> {
    const params = {
      serviceKey: this.serviceKey,
      pageNo: String(options.pageNo || 1),
      numOfRows: String(options.numOfRows || 100),
      ...(options.ctpvNm && { ctpvNm: options.ctpvNm }),
      ...(options.sggNm && { sggNm: options.sggNm }),
    };

    // 캐시 키 생성
    const url = `${this.baseUrl}/LcgvWelfarelist`;
    const cacheKey = CacheKey.fromUrlAndParams(url, params);

    // 캐시 조회
    const cachedData = await this.cacheRepository.findByCacheKey(cacheKey);
    if (cachedData) {
      this.logger.log(`Cache hit for welfare list (TTL: ${cachedData.getRemainingTtl()}s)`);
      return cachedData.getParsedResponseData();
    }

    try {
      this.logger.log(`Fetching welfare list with params: ${JSON.stringify(params)}`);

      const response = await firstValueFrom(
        this.httpService.get(url, { params }),
      );

      // API가 JSON으로 응답함
      const data = response.data;

      // Check for errors
      if (data.resultCode !== '0') {
        const errorMsg = data.resultMessage || 'Unknown error';
        throw new ApiRequestFailedException(`API Error: ${errorMsg}`);
      }

      const servList = data.servList || [];

      // JSON 형식을 기존 XML 형식으로 변환
      const result = servList.map((item: any) => ({
        servId: [item.servId],
        servNm: [item.servNm],
        servDgst: [item.servDgst],
        ctpvNm: [item.ctpvNm],
        sggNm: [item.sggNm],
        bizChrDeptNm: [item.bizChrDeptNm],
        srvPvsnNm: [item.srvPvsnNm],
        sprtCycNm: [item.sprtCycNm],
        aplyMtdNm: [item.aplyMtdNm],
        lifeNmArray: [item.lifeNmArray],
        trgterIndvdlNmArray: [item.trgterIndvdlNmArray],
        intrsThemaNmArray: [item.intrsThemaNmArray],
        inqNum: [item.inqNum],
        servDtlLink: [item.servDtlLink],
        lastModYmd: [item.lastModYmd],
      }));

      // 캐시 저장 (TTL 100시간 = 360000초)
      const cache = ApiCache.create(cacheKey, result, 360000);
      await this.cacheRepository.save(cache);
      this.logger.log(`Cached welfare list (TTL: 100 hours)`);

      return result;
    } catch (error) {
      // 429 에러 감지
      if (error.response?.status === 429) {
        this.logger.error(`Rate limit exceeded for welfare list: ${error.message}`);
        throw new RateLimitExceededException('지자체 복지 API', error.response?.data);
      }

      // 400 에러는 페이지가 범위를 벗어난 경우 (더 이상 데이터 없음)
      if (error.response?.status === 400) {
        this.logger.warn(`Page ${params.pageNo} is out of range (400 Bad Request). Returning empty array.`);
        return [];
      }

      this.logger.error(`Failed to fetch welfare list: ${error.message}`);
      throw new ApiRequestFailedException(error.message);
    }
  }

  /**
   * 복지서비스 상세 조회
   *
   * @param servId - 서비스 ID
   * @returns 복지서비스 상세 정보
   */
  async getWelfareDetail(servId: string): Promise<WelfareDetailResponse> {
    const params = {
      serviceKey: this.serviceKey,
      servId: servId,
    };

    // 캐시 키 생성
    const url = `${this.baseUrl}/LcgvWelfaredetailed`;
    const cacheKey = CacheKey.fromUrlAndParams(url, params);

    // 캐시 조회
    const cachedData = await this.cacheRepository.findByCacheKey(cacheKey);
    if (cachedData) {
      this.logger.log(`Cache hit for welfare detail ${servId} (TTL: ${cachedData.getRemainingTtl()}s)`);
      return cachedData.getParsedResponseData();
    }

    try {
      this.logger.log(`Fetching welfare detail for servId: ${servId}`);

      const response = await firstValueFrom(
        this.httpService.get(url, { params }),
      );

      // API가 XML로 응답함 - XML 파싱 필요
      const parsed: any = await parseXml(response.data);

      // 응답 전체 로깅
      this.logger.debug(`Detail API Response for ${servId}: ${typeof response.data === 'string' ? response.data.substring(0, 500) : JSON.stringify(response.data).substring(0, 500)}`);

      // XML 구조: <wantedDtl><resultCode>0</resultCode>...</wantedDtl>
      const detail = parsed.wantedDtl;

      if (!detail) {
        throw new ApiRequestFailedException('Invalid XML structure: wantedDtl not found');
      }

      // Check for errors (XML은 배열로 파싱됨)
      if (detail.resultCode?.[0] !== '0') {
        const errorMsg = detail.resultMessage?.[0] || 'Unknown error';
        this.logger.error(`API Error Response: resultCode=${detail.resultCode?.[0]}, message=${errorMsg}`);
        throw new ApiRequestFailedException(`API Error: ${errorMsg}`);
      }

      const result = {
        servId: detail.servId?.[0] || servId,
        servNm: detail.servNm?.[0] || '',
        servDgst: detail.servDgst?.[0],
        ctpvNm: detail.ctpvNm?.[0],
        sggNm: detail.sggNm?.[0],
        bizChrDeptNm: detail.bizChrDeptNm?.[0],
        srvPvsnNm: detail.srvPvsnNm?.[0],
        sprtCycNm: detail.sprtCycNm?.[0],
        aplyMtdNm: detail.aplyMtdNm?.[0],
        lifeNmArray: detail.lifeNmArray?.[0],
        trgterIndvdlNmArray: detail.trgterIndvdlNmArray?.[0],
        intrsThemaNmArray: detail.intrsThemaNmArray?.[0],
        sprtTrgtCn: detail.sprtTrgtCn?.[0],
        slctCritCn: detail.slctCritCn?.[0],
        alwServCn: detail.alwServCn?.[0],
        aplyMtdCn: detail.aplyMtdCn?.[0],
        inqNum: detail.inqNum?.[0],
        lastModYmd: detail.lastModYmd?.[0],
      };

      // 캐시 저장 (TTL 100시간 = 360000초)
      const cache = ApiCache.create(cacheKey, result, 360000);
      await this.cacheRepository.save(cache);
      this.logger.log(`Cached welfare detail for ${servId} (TTL: 100 hours)`);

      return result;
    } catch (error) {
      // 429 에러 감지
      if (error.response?.status === 429) {
        this.logger.error(`Rate limit exceeded for welfare detail ${servId}: ${error.message}`);
        throw new RateLimitExceededException('지자체 복지 API', error.response?.data);
      }
      this.logger.error(`Failed to fetch welfare detail for ${servId}: ${error.message}`);
      this.logger.error(`Error details: ${JSON.stringify(error.response?.data || error)}`);
      throw new ApiRequestFailedException(`상세 정보 조회 실패 (${servId}): ${error.message}`);
    }
  }

  /**
   * 모든 복지서비스 데이터 가져오기 (페이지네이션)
   *
   * @returns 전체 복지서비스 목록
   */
  async getAllWelfareServices(): Promise<WelfareListItem[]> {
    const allServices: WelfareListItem[] = [];
    let pageNo = 1;
    const numOfRows = 100;
    let hasMore = true;

    while (hasMore) {
      this.logger.log(`Fetching page ${pageNo}...`);
      const services = await this.getWelfareList({ pageNo, numOfRows });

      if (services.length === 0) {
        hasMore = false;
      } else {
        allServices.push(...services);
        pageNo += 1;
      }

      // Safety limit to prevent infinite loops
      if (pageNo > 1000) {
        this.logger.warn('Reached page limit of 1000');
        break;
      }
    }

    this.logger.log(`Fetched total of ${allServices.length} services`);
    return allServices;
  }
}
