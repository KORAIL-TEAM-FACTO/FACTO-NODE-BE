import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

// Presentation Layer
import { ChatController } from './presentation/controllers/ChatController';
import { ChatGateway } from './presentation/gateways/ChatGateway';

// Application Layer
import { CreateChatSessionUseCase } from './application/use-cases/CreateChatSession.use-case';
import { SendChatMessageUseCase } from './application/use-cases/SendChatMessage.use-case';
import { GetChatHistoryUseCase } from './application/use-cases/GetChatHistory.use-case';
import { ChatAIService } from './application/services/ChatAIService';

// Infrastructure Layer
import { ChatSessionEntity } from './infrastructure/persistence/ChatSessionEntity';
import { ChatMessageEntity } from './infrastructure/persistence/ChatMessageEntity';
import { ChatSessionRepository } from './infrastructure/repositories/ChatSessionRepository';
import { ChatMessageRepository } from './infrastructure/repositories/ChatMessageRepository';
import { CHAT_SESSION_REPOSITORY } from './domain/repositories/ChatSessionRepository.interface';
import { CHAT_MESSAGE_REPOSITORY } from './domain/repositories/ChatMessageRepository.interface';

// Import CallsModule for AIConversationService
import { CallsModule } from '../calls/Calls.module';

/**
 * Chat Module
 *
 * @description
 * - WebSocket 기반 실시간 채팅
 * - AI 대화 통합
 * - 복지 서비스 검색
 */
@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([ChatSessionEntity, ChatMessageEntity]),
    CallsModule, // AIConversationService 사용
  ],
  controllers: [ChatController],
  providers: [
    // Gateways
    ChatGateway,

    // Services
    ChatAIService,

    // Use Cases
    CreateChatSessionUseCase,
    SendChatMessageUseCase,
    GetChatHistoryUseCase,

    // Repositories
    {
      provide: CHAT_SESSION_REPOSITORY,
      useClass: ChatSessionRepository,
    },
    {
      provide: CHAT_MESSAGE_REPOSITORY,
      useClass: ChatMessageRepository,
    },
  ],
  exports: [CHAT_SESSION_REPOSITORY, CHAT_MESSAGE_REPOSITORY, ChatGateway],
})
export class ChatModule {}
