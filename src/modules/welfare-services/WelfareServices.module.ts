import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';

// Domain
import { WelfareService } from './domain/entities/WelfareService.entity';
import { ApiCache } from './domain/entities/ApiCache.entity';
import { WELFARE_SERVICE_REPOSITORY } from './domain/repositories/WelfareServiceRepository.interface';
import { API_CACHE_REPOSITORY } from './domain/repositories/ApiCacheRepository.interface';

// Infrastructure
import { WelfareServiceRepository } from './infrastructure/repositories/WelfareServiceRepository';
import { ApiCacheRepository } from './infrastructure/repositories/ApiCacheRepository';
import { LocalWelfareApiClient } from './infrastructure/clients/LocalWelfareApiClient';
import { CentralWelfareApiClient } from './infrastructure/clients/CentralWelfareApiClient';
import { PrivateWelfareApiClient } from './infrastructure/clients/PrivateWelfareApiClient';

// Application
import { AISummaryService } from './application/services/AISummaryService';
import { SyncWelfareServicesUseCase } from './application/use-cases/SyncWelfareServices.use-case';
import { GetWelfareServiceUseCase } from './application/use-cases/GetWelfareService.use-case';
import { GetAllWelfareServicesUseCase } from './application/use-cases/GetAllWelfareServices.use-case';
import { SearchWelfareServicesByRegionUseCase } from './application/use-cases/SearchWelfareServicesByRegion.use-case';
import { SearchWelfareServicesByKeywordUseCase } from './application/use-cases/SearchWelfareServicesByKeyword.use-case';

// Presentation
import { WelfareServicesController } from './presentation/controllers/WelfareServicesController';

/**
 * Welfare Services Module
 *
 * @description 복지 서비스 도메인 모듈
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([WelfareService, ApiCache]),
    HttpModule,
    ConfigModule,
  ],
  controllers: [WelfareServicesController],
  providers: [
    // Infrastructure
    LocalWelfareApiClient,
    CentralWelfareApiClient,
    PrivateWelfareApiClient,
    {
      provide: WELFARE_SERVICE_REPOSITORY,
      useClass: WelfareServiceRepository,
    },
    {
      provide: API_CACHE_REPOSITORY,
      useClass: ApiCacheRepository,
    },

    // Application Services
    AISummaryService,

    // Use Cases
    SyncWelfareServicesUseCase,
    GetWelfareServiceUseCase,
    GetAllWelfareServicesUseCase,
    SearchWelfareServicesByRegionUseCase,
    SearchWelfareServicesByKeywordUseCase,
  ],
  exports: [
    WELFARE_SERVICE_REPOSITORY,
    API_CACHE_REPOSITORY,
    AISummaryService,
    SearchWelfareServicesByKeywordUseCase, // AI에서 사용하도록 export
  ],
})
export class WelfareServicesModule {}
