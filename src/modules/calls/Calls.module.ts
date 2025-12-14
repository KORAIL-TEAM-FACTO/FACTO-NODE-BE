import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

// Presentation Layer
import { CallsController } from './presentation/controllers/CallsController';
import { SignalingGateway } from './presentation/gateways/SignalingGateway';

// Application Layer
import { InitiateCallUseCase } from './application/use-cases/InitiateCall.use-case';
import { ConnectCallUseCase } from './application/use-cases/ConnectCall.use-case';
import { EndCallUseCase } from './application/use-cases/EndCall.use-case';
import { GetCallUseCase } from './application/use-cases/GetCall.use-case';
import { ProcessAIConversationUseCase } from './application/use-cases/ProcessAIConversation.use-case';
import { AIConversationService } from './application/services/AIConversationService';
import { WebRTCConfigService } from './application/services/WebRTCConfigService';
import { VoiceActivityDetectionService } from './application/services/VoiceActivityDetectionService';

// Infrastructure Layer
import { CallEntity } from './infrastructure/persistence/CallEntity';
import { TypeOrmCallRepository } from './infrastructure/repositories/TypeOrmCallRepository';
import { CALL_REPOSITORY } from './domain/repositories/CallRepository.interface';

// Import WelfareServicesModule
import { WelfareServicesModule } from '../welfare-services/WelfareServices.module';

/**
 * Calls Module
 *
 * @description
 * - WebRTC 기반 실시간 통화 시스템
 * - ChatGPT AI 통합 자연스러운 대화
 * - Socket.IO 기반 시그널링
 */
@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([CallEntity]),
    WelfareServicesModule, // 복지 서비스 모듈 추가
  ],
  controllers: [CallsController],
  providers: [
    // Gateways
    SignalingGateway,

    // Services
    AIConversationService,
    WebRTCConfigService,
    VoiceActivityDetectionService,

    // Use Cases
    InitiateCallUseCase,
    ConnectCallUseCase,
    EndCallUseCase,
    GetCallUseCase,
    ProcessAIConversationUseCase,

    // Repositories
    {
      provide: CALL_REPOSITORY,
      useClass: TypeOrmCallRepository,
    },
  ],
  exports: [CALL_REPOSITORY, SignalingGateway, AIConversationService],
})
export class CallsModule {}
