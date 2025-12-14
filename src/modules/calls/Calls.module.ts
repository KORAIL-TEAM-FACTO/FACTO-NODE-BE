import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

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

// Infrastructure Layer
import { CallRepository } from './infrastructure/repositories/CallRepository';
import { CALL_REPOSITORY } from './domain/repositories/CallRepository.interface';

/**
 * Calls Module
 *
 * @description
 * - WebRTC 기반 실시간 통화 시스템
 * - ChatGPT AI 통합 자연스러운 대화
 * - Socket.IO 기반 시그널링
 */
@Module({
  imports: [ConfigModule],
  controllers: [CallsController],
  providers: [
    // Gateways
    SignalingGateway,

    // Services
    AIConversationService,
    WebRTCConfigService,

    // Use Cases
    InitiateCallUseCase,
    ConnectCallUseCase,
    EndCallUseCase,
    GetCallUseCase,
    ProcessAIConversationUseCase,

    // Repositories
    {
      provide: CALL_REPOSITORY,
      useClass: CallRepository,
    },
  ],
  exports: [CALL_REPOSITORY, SignalingGateway, AIConversationService],
})
export class CallsModule {}
