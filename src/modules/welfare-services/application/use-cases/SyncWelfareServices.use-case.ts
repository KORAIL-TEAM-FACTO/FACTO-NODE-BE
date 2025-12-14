import { Injectable, Inject, Logger } from '@nestjs/common';
import type { IWelfareServiceRepository } from '../../domain/repositories/WelfareServiceRepository.interface';
import { WELFARE_SERVICE_REPOSITORY } from '../../domain/repositories/WelfareServiceRepository.interface';
import { WelfareService } from '../../domain/entities/WelfareService.entity';
import { LocalWelfareApiClient } from '../../infrastructure/clients/LocalWelfareApiClient';
import { CentralWelfareApiClient } from '../../infrastructure/clients/CentralWelfareApiClient';
import { PrivateWelfareApiClient } from '../../infrastructure/clients/PrivateWelfareApiClient';
import { AISummaryService } from '../services/AISummaryService';
import { RateLimitExceededException } from '../../domain/exceptions/RateLimitExceededException';

/**
 * Sync Welfare Services Use Case
 *
 * @description
 * - 공공데이터 포털에서 전체 복지서비스 데이터를 가져와 저장
 * - AI 요약 생성
 * - 기존 데이터와 비교하여 업데이트
 */
@Injectable()
export class SyncWelfareServicesUseCase {
  private readonly logger = new Logger(SyncWelfareServicesUseCase.name);

  constructor(
    @Inject(WELFARE_SERVICE_REPOSITORY)
    private readonly repository: IWelfareServiceRepository,
    private readonly localApiClient: LocalWelfareApiClient,
    private readonly centralApiClient: CentralWelfareApiClient,
    private readonly privateApiClient: PrivateWelfareApiClient,
    private readonly aiSummaryService: AISummaryService,
  ) {}

  /**
   * 복지서비스 동기화 실행
   *
   * @param generateAiSummary - AI 요약 생성 여부
   * @returns 동기화 결과
   */
  async execute(generateAiSummary: boolean = true): Promise<{
    synced: number;
    created: number;
    updated: number;
    aiSummaryGenerated: number;
    local: { synced: number; created: number; updated: number };
    central: { synced: number; created: number; updated: number };
    private: { synced: number; created: number; updated: number };
  }> {
    this.logger.log('Starting welfare services sync...');

    let totalCreated = 0;
    let totalUpdated = 0;
    let aiSummaryGenerated = 0;

    // 1. 지자체 복지 서비스 동기화
    let localResult = { synced: 0, created: 0, updated: 0, aiSummaryGenerated: 0 };
    try {
      localResult = await this.syncLocalWelfareServices(generateAiSummary);
      totalCreated += localResult.created;
      totalUpdated += localResult.updated;
      aiSummaryGenerated += localResult.aiSummaryGenerated;
    } catch (error) {
      if (error instanceof RateLimitExceededException) {
        this.logger.warn('⚠️  지자체 복지 API에서 429 에러 발생, 스킵하고 다음으로...');
      } else {
        this.logger.error(`지자체 복지 동기화 실패: ${error.message}`);
      }
    }

    // 2. 중앙부처 복지 서비스 동기화
    let centralResult = { synced: 0, created: 0, updated: 0, aiSummaryGenerated: 0 };
    try {
      centralResult = await this.syncCentralWelfareServices(generateAiSummary);
      totalCreated += centralResult.created;
      totalUpdated += centralResult.updated;
      aiSummaryGenerated += centralResult.aiSummaryGenerated;
    } catch (error) {
      if (error instanceof RateLimitExceededException) {
        this.logger.warn('⚠️  중앙부처 복지 API에서 429 에러 발생, 스킵하고 다음으로...');
      } else {
        this.logger.error(`중앙부처 복지 동기화 실패: ${error.message}`);
      }
    }

    // 3. 민간 복지 서비스 동기화
    let privateResult = { synced: 0, created: 0, updated: 0, aiSummaryGenerated: 0 };
    try {
      privateResult = await this.syncPrivateWelfareServices(generateAiSummary);
      totalCreated += privateResult.created;
      totalUpdated += privateResult.updated;
      aiSummaryGenerated += privateResult.aiSummaryGenerated;
    } catch (error) {
      if (error instanceof RateLimitExceededException) {
        this.logger.warn('⚠️  민간 복지 API에서 429 에러 발생, 스킵하고 다음으로...');
      } else {
        this.logger.error(`민간 복지 동기화 실패: ${error.message}`);
      }
    }

    const result = {
      synced: localResult.synced + centralResult.synced + privateResult.synced,
      created: totalCreated,
      updated: totalUpdated,
      aiSummaryGenerated,
      local: {
        synced: localResult.synced,
        created: localResult.created,
        updated: localResult.updated,
      },
      central: {
        synced: centralResult.synced,
        created: centralResult.created,
        updated: centralResult.updated,
      },
      private: {
        synced: privateResult.synced,
        created: privateResult.created,
        updated: privateResult.updated,
      },
    };

    this.logger.log(`Sync completed: ${JSON.stringify(result)}`);
    return result;
  }

  /**
   * 지자체 복지서비스 동기화
   */
  private async syncLocalWelfareServices(generateAiSummary: boolean): Promise<{
    synced: number;
    created: number;
    updated: number;
    aiSummaryGenerated: number;
  }> {
    this.logger.log('Starting local welfare services sync...');

    let created = 0;
    let updated = 0;
    let aiSummaryGenerated = 0;
    let totalSynced = 0;
    let pageNo = 1;
    const numOfRows = 100;
    let hasMore = true;

    while (hasMore) {
      this.logger.log(`Fetching local welfare page ${pageNo}...`);

      try {
        const apiServices = await this.localApiClient.getWelfareList({ pageNo, numOfRows });

        if (apiServices.length === 0) {
          hasMore = false;
          break;
        }

        totalSynced += apiServices.length;

        for (const apiService of apiServices) {
          const servId = apiService.servId[0];
          const servNm = apiService.servNm[0];

          try {
            // Fetch detailed information (429 발생 시 바로 throw)
            const detail = await this.localApiClient.getWelfareDetail(servId);

            if (!detail) {
              this.logger.error(`Failed to fetch detail for ${servId}, skipping...`);
              continue; // 다음 항목으로
            }

            // Check if service already exists
            const existing = await this.repository.findById(servId);

            if (existing) {
              // 이미 존재하면 업데이트만 (AI 요약 스킵)
              this.logger.log(`Skipping existing service: ${servId}`);
              updated += 1;
            } else {
              // Create new service
              this.logger.log(`Creating new local service: ${servId}`);

              const newService = WelfareService.createLocal({
                serviceId: servId,
                serviceName: servNm,
                serviceSummary: detail.servDgst || '',
                ctpvNm: detail.ctpvNm || '',
                sggNm: detail.sggNm || '',
                bizChrDeptNm: detail.bizChrDeptNm || '',
                supportType: detail.srvPvsnNm || '',
                supportCycle: detail.sprtCycNm || '',
                applicationMethod: detail.aplyMtdNm || '',
                lifeCycleArray: detail.lifeNmArray || '',
                targetArray: detail.trgterIndvdlNmArray || '',
                interestThemeArray: detail.intrsThemaNmArray || '',
                supportTargetContent: detail.sprtTrgtCn || '',
                selectionCriteria: detail.slctCritCn || '',
                serviceContent: detail.alwServCn || '',
                applicationMethodContent: detail.aplyMtdCn || '',
                inquiryCount: parseInt(detail.inqNum || '0', 10),
                detailLink: '',
                lastModifiedDate: detail.lastModYmd || '',
              });

              // Generate AI summary if requested (새로운 것만)
              if (generateAiSummary) {
                try {
                  const aiSummary = await this.aiSummaryService.summarizeService(
                    servNm,
                    detail.servDgst,
                  );
                  newService.updateAiSummary(aiSummary);
                  aiSummaryGenerated += 1;
                  await this.sleep(500); // AI 요청 간격
                } catch (error) {
                  this.logger.warn(`Failed to generate AI summary for ${servId}: ${error.message}`);
                }
              }

              await this.repository.save(newService);
              created += 1;
            }

            // Rate limiting - 더 긴 간격으로 조정
            await this.sleep(500);
          } catch (error) {
            // 429 에러는 API 전체 스킵을 위해 throw
            if (error instanceof RateLimitExceededException) {
              this.logger.warn(`⚠️  지자체 복지 상세 조회에서 429 에러 발생 (${servId}), API 전체 스킵`);
              throw error;
            }
            this.logger.error(`❌ 동기화 실패 (${servId}): ${error.message}`);
            // 다른 에러는 개별 항목만 스킵하고 계속 진행
            continue;
          }
        }

        // 다음 페이지로
        if (apiServices.length < numOfRows) {
          hasMore = false;
        } else {
          pageNo += 1;
        }

        // Safety limit
        if (pageNo > 1000) {
          this.logger.warn('Reached page limit of 1000');
          break;
        }
      } catch (error) {
        // 429 에러 발생 시 해당 API Client 전체를 스킵
        if (error instanceof RateLimitExceededException) {
          this.logger.warn(`⚠️  지자체 복지 API에서 429 에러 발생 (page ${pageNo}), API 전체 스킵`);
          throw error; // 상위로 던져서 전체 API 스킵
        }

        this.logger.error(`❌ 지자체 복지 페이지 ${pageNo} 동기화 실패: ${error.message}`);
        // 429가 아닌 다른 에러는 다음 페이지 시도
        pageNo += 1;
      }
    }

    const result = {
      synced: totalSynced,
      created,
      updated,
      aiSummaryGenerated,
    };

    this.logger.log(`Local sync completed: ${JSON.stringify(result)}`);
    return result;
  }

  /**
   * 중앙부처 복지서비스 동기화
   */
  private async syncCentralWelfareServices(generateAiSummary: boolean): Promise<{
    synced: number;
    created: number;
    updated: number;
    aiSummaryGenerated: number;
  }> {
    this.logger.log('Starting central welfare services sync...');

    let created = 0;
    let updated = 0;
    let aiSummaryGenerated = 0;
    let totalSynced = 0;
    let page = 1;
    const perPage = 100;
    let hasMore = true;

    while (hasMore) {
      this.logger.log(`Fetching central welfare page ${page}...`);

      try {
        const apiServices = await this.centralApiClient.getCentralWelfareList({ page, perPage });

        if (apiServices.length === 0) {
          hasMore = false;
          break;
        }

        totalSynced += apiServices.length;

        for (const apiService of apiServices) {
          const servId = apiService.서비스아이디;
          const servNm = apiService.서비스명;

          try {
            // Check if service already exists
            const existing = await this.repository.findById(servId);

            if (existing) {
              // 이미 존재하면 스킵 (AI 요약 스킵)
              this.logger.log(`Skipping existing service: ${servId}`);
              updated += 1;
            } else {
              // Create new service
              this.logger.log(`Creating new central service: ${servId}`);

              const newService = WelfareService.createCentral({
                serviceId: servId,
                serviceName: servNm,
                serviceSummary: apiService.서비스요약 || '',
                serviceUrl: apiService.서비스URL || '',
                site: apiService.사이트 || '',
                contact: apiService.대표문의 || '',
                department: apiService.소관부처명 || '',
                organization: apiService.소관조직명 || '',
                baseYear: apiService.기준연도 || 0,
                lastModifiedDate: apiService.최종수정일 || '',
              });

              // Generate AI summary if requested (새로운 것만)
              if (generateAiSummary) {
                try {
                  const aiSummary = await this.aiSummaryService.summarizeService(
                    servNm,
                    apiService.서비스요약,
                  );
                  newService.updateAiSummary(aiSummary);
                  aiSummaryGenerated += 1;
                  await this.sleep(500); // AI 요청 간격
                } catch (error) {
                  this.logger.warn(`Failed to generate AI summary for ${servId}: ${error.message}`);
                }
              }

              await this.repository.save(newService);
              created += 1;
            }

            // Rate limiting
            await this.sleep(100);
          } catch (error) {
            // 429 에러는 API 전체 스킵을 위해 throw
            if (error instanceof RateLimitExceededException) {
              this.logger.warn(`⚠️  중앙부처 복지에서 429 에러 발생 (${servId}), API 전체 스킵`);
              throw error;
            }
            this.logger.error(`❌ 중앙부처 동기화 실패 (${servId}): ${error.message}`);
            // 다른 에러는 개별 항목만 스킵하고 계속 진행
            continue;
          }
        }

        // 다음 페이지로
        if (apiServices.length < perPage) {
          hasMore = false;
        } else {
          page += 1;
        }

        // Safety limit
        if (page > 100) {
          this.logger.warn('Reached page limit of 100 for central welfare');
          break;
        }
      } catch (error) {
        // 429 에러 발생 시 해당 API Client 전체를 스킵
        if (error instanceof RateLimitExceededException) {
          this.logger.warn(`⚠️  중앙부처 복지 API에서 429 에러 발생 (page ${page}), API 전체 스킵`);
          throw error; // 상위로 던져서 전체 API 스킵
        }

        this.logger.error(`❌ 중앙부처 복지 페이지 ${page} 동기화 실패: ${error.message}`);
        // 429가 아닌 다른 에러는 다음 페이지 시도
        page += 1;
      }
    }

    const result = {
      synced: totalSynced,
      created,
      updated,
      aiSummaryGenerated,
    };

    this.logger.log(`Central sync completed: ${JSON.stringify(result)}`);
    return result;
  }

  /**
   * 민간 복지서비스 동기화
   */
  private async syncPrivateWelfareServices(generateAiSummary: boolean): Promise<{
    synced: number;
    created: number;
    updated: number;
    aiSummaryGenerated: number;
  }> {
    this.logger.log('Starting private welfare services sync...');

    let created = 0;
    let updated = 0;
    let aiSummaryGenerated = 0;
    let totalSynced = 0;
    let page = 1;
    const perPage = 100;
    let hasMore = true;

    while (hasMore) {
      this.logger.log(`Fetching private welfare page ${page}...`);

      try {
        const apiServices = await this.privateApiClient.getPrivateWelfareList({ page, perPage });

        if (apiServices.length === 0) {
          hasMore = false;
          break;
        }

        totalSynced += apiServices.length;

        for (const apiService of apiServices) {
          // ID 생성: PRIVATE_{기관명}_{사업명} (해시화)
          const serviceId = `PRIVATE_${Buffer.from(`${apiService.기관명}_${apiService.사업명}`).toString('base64').substring(0, 40)}`;

          try {
            // Check if service already exists
            const existing = await this.repository.findById(serviceId);

            if (existing) {
              this.logger.log(`Skipping existing private service: ${serviceId}`);
              updated += 1;
            } else {
              // Create new service
              this.logger.log(`Creating new private service: ${serviceId} (${apiService.사업명})`);

              const newService = WelfareService.createPrivate({
                serviceId: serviceId,
                organizationName: apiService.기관명,
                serviceName: apiService.사업명,
                projectStartDate: apiService.사업시작일 || '',
                projectEndDate: apiService.사업종료일 || '',
                serviceSummary: apiService.사업목적 || '',
                supportTargetContent: apiService.지원대상 || '',
                serviceContent: apiService.지원내용 || '',
                applicationMethodContent: apiService.신청방법 || '',
                requiredDocuments: apiService.제출서류 || '',
                etc: apiService.기타 || '',
                lifeCycleArray: apiService.생애주기 || '',
                householdStatus: apiService.가구상황 || '',
                interestThemeArray: apiService.관심주제 || '',
              });

              // Generate AI summary if requested (새로운 것만)
              if (generateAiSummary) {
                try {
                  const aiSummary = await this.aiSummaryService.summarizeService(
                    apiService.사업명,
                    apiService.사업목적 || apiService.지원내용,
                  );
                  newService.updateAiSummary(aiSummary);
                  aiSummaryGenerated += 1;
                  await this.sleep(500); // AI 요청 간격
                } catch (error) {
                  this.logger.warn(`Failed to generate AI summary for ${serviceId}: ${error.message}`);
                }
              }

              await this.repository.save(newService);
              created += 1;
            }

            // Rate limiting
            await this.sleep(50);
          } catch (error) {
            // 429 에러는 API 전체 스킵을 위해 throw
            if (error instanceof RateLimitExceededException) {
              this.logger.warn(`⚠️  민간 복지에서 429 에러 발생 (${serviceId}), API 전체 스킵`);
              throw error;
            }
            this.logger.error(`❌ 민간복지 동기화 실패 (${serviceId}): ${error.message}`);
            // 다른 에러는 개별 항목만 스킵하고 계속 진행
            continue;
          }
        }

        // 다음 페이지로
        if (apiServices.length < perPage) {
          hasMore = false;
        } else {
          page += 1;
        }

        // Safety limit
        if (page > 100) {
          this.logger.warn('Reached page limit of 100');
          break;
        }
      } catch (error) {
        // 429 에러 발생 시 해당 API Client 전체를 스킵
        if (error instanceof RateLimitExceededException) {
          this.logger.warn(`⚠️  민간 복지 API에서 429 에러 발생 (page ${page}), API 전체 스킵`);
          throw error; // 상위로 던져서 전체 API 스킵
        }

        this.logger.error(`❌ 민간 복지 페이지 ${page} 동기화 실패: ${error.message}`);
        // 429가 아닌 다른 에러는 다음 페이지 시도
        page += 1;
      }
    }

    const result = {
      synced: totalSynced,
      created,
      updated,
      aiSummaryGenerated,
    };

    this.logger.log(`Private sync completed: ${JSON.stringify(result)}`);
    return result;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
