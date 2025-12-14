import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, OnModuleDestroy } from '@nestjs/common';
import { CreateChatSessionUseCase } from '../../application/use-cases/CreateChatSession.use-case';
import { SendChatMessageUseCase } from '../../application/use-cases/SendChatMessage.use-case';
import { GetChatHistoryUseCase } from '../../application/use-cases/GetChatHistory.use-case';
import { ChatAIService } from '../../application/services/ChatAIService';

/**
 * Chat Gateway
 *
 * @description
 * - WebSocket 기반 실시간 채팅
 * - AI 대화 통합
 * - 복지 서비스 검색 (Function Calling)
 */
@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: '/chat',
})
export class ChatGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnModuleDestroy
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);
  private readonly sessions = new Map<
    string,
    { socketId: string; userId: string; sessionId: string }
  >();
  private readonly conversationHistory = new Map<
    string,
    { role: 'user' | 'assistant'; content: string }[]
  >();
  private readonly sessionLastActivity = new Map<string, number>();
  private readonly SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30분
  private readonly CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5분
  private cleanupInterval?: NodeJS.Timeout;

  constructor(
    private readonly createSessionUseCase: CreateChatSessionUseCase,
    private readonly sendMessageUseCase: SendChatMessageUseCase,
    private readonly getChatHistoryUseCase: GetChatHistoryUseCase,
    private readonly chatAIService: ChatAIService,
  ) {
    this.startPeriodicCleanup();
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);

    // Cleanup session
    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.socketId === client.id) {
        this.logger.log(`Cleaning up session ${sessionId}`);
        // 세션은 유지하고 연결만 끊김 (재연결 가능)
        break;
      }
    }
  }

  /**
   * Join chat session
   */
  @SubscribeMessage('join-chat')
  async handleJoinChat(
    @MessageBody() data: { userId: string; sessionId?: string },
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    const { userId, sessionId: requestedSessionId } = data;

    // 세션 ID 생성 또는 사용
    const sessionId = requestedSessionId || crypto.randomUUID();

    this.logger.log(`User ${userId} joining chat session ${sessionId}`);

    try {
      // 세션 생성 (이미 있으면 재사용)
      await this.createSessionUseCase.execute(userId, sessionId);

      // 세션 정보 저장
      this.sessions.set(sessionId, {
        socketId: client.id,
        userId,
        sessionId,
      });

      // 활동 시간 업데이트
      this.updateSessionActivity(sessionId);

      // 채팅방 입장
      client.join(sessionId);

      // 대화 히스토리 초기화 (없으면)
      if (!this.conversationHistory.has(sessionId)) {
        this.conversationHistory.set(sessionId, []);
      }

      // 클라이언트에 세션 정보 전송
      client.emit('chat-joined', {
        sessionId,
        userId,
        message: '채팅에 참가했습니다',
      });

      // 이전 대화 히스토리 전송
      const history = await this.getChatHistoryUseCase.execute(sessionId, 50);
      client.emit('chat-history', { messages: history });

      // 환영 메시지 전송 (히스토리가 없는 경우에만)
      if (history.length === 0) {
        const welcomeMessage = '안녕하세요! 복지 서비스 검색 AI입니다. 무엇을 도와드릴까요?';

        // AI 환영 메시지 저장
        await this.sendMessageUseCase.execute(
          sessionId,
          'assistant',
          welcomeMessage,
          'TEXT',
        );

        // 클라이언트에 전송
        this.server.to(sessionId).emit('ai-message', {
          content: welcomeMessage,
          timestamp: Date.now(),
        });

        this.logger.log(`Welcome message sent to session ${sessionId}`);
      }
    } catch (error) {
      this.logger.error(`Failed to join chat: ${error.message}`);
      client.emit('error', {
        message: '채팅 참가에 실패했습니다',
      });
    }
  }

  /**
   * Send text message
   */
  @SubscribeMessage('send-message')
  async handleSendMessage(
    @MessageBody() data: { sessionId: string; message: string },
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    const { sessionId, message } = data;

    this.logger.log(`Received message from session ${sessionId}: "${message}"`);

    // 활동 시간 업데이트
    this.updateSessionActivity(sessionId);

    try {
      // 사용자 메시지 저장
      await this.sendMessageUseCase.execute(
        sessionId,
        'user',
        message,
        'TEXT',
      );

      // 클라이언트에 에코 (메시지 전송 확인)
      client.emit('message-sent', {
        content: message,
        timestamp: Date.now(),
      });

      // 대화 히스토리 가져오기
      const history = this.conversationHistory.get(sessionId) || [];

      // AI 응답 생성
      const aiResponse = await this.chatAIService.generateResponse(
        message,
        history,
      );

      this.logger.log(`AI response: "${aiResponse}"`);

      // 대화 히스토리 업데이트
      history.push({ role: 'user', content: message });
      history.push({ role: 'assistant', content: aiResponse });

      // 최근 20개 메시지만 유지
      if (history.length > 20) {
        history.splice(0, history.length - 20);
      }

      this.conversationHistory.set(sessionId, history);

      // AI 응답 저장
      await this.sendMessageUseCase.execute(
        sessionId,
        'assistant',
        aiResponse,
        'TEXT',
      );

      // 클라이언트에 AI 응답 전송
      this.server.to(sessionId).emit('ai-message', {
        content: aiResponse,
        timestamp: Date.now(),
      });

      this.logger.log(`AI response sent to session ${sessionId}`);
    } catch (error) {
      this.logger.error(`Failed to process message: ${error.message}`);
      client.emit('error', {
        message: '메시지 처리에 실패했습니다',
      });
    }
  }

  /**
   * Leave chat session
   */
  @SubscribeMessage('leave-chat')
  handleLeaveChat(
    @MessageBody() data: { sessionId: string },
    @ConnectedSocket() client: Socket,
  ): void {
    const { sessionId } = data;

    this.logger.log(`User leaving chat session ${sessionId}`);

    // 채팅방 나가기
    client.leave(sessionId);

    // 세션 정보 제거 (재연결 가능하므로 히스토리는 유지)
    this.sessions.delete(sessionId);

    client.emit('chat-left', { sessionId });
  }

  /**
   * Get chat history
   */
  @SubscribeMessage('get-history')
  async handleGetHistory(
    @MessageBody() data: { sessionId: string; limit?: number },
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    const { sessionId, limit = 50 } = data;

    try {
      const history = await this.getChatHistoryUseCase.execute(sessionId, limit);

      client.emit('chat-history', { messages: history });
    } catch (error) {
      this.logger.error(`Failed to get history: ${error.message}`);
      client.emit('error', {
        message: '히스토리 조회에 실패했습니다',
      });
    }
  }

  /**
   * Typing indicator
   */
  @SubscribeMessage('typing')
  handleTyping(
    @MessageBody() data: { sessionId: string; isTyping: boolean },
    @ConnectedSocket() client: Socket,
  ): void {
    const { sessionId, isTyping } = data;

    // 같은 세션의 다른 사용자에게 타이핑 상태 전송
    client.to(sessionId).emit('user-typing', { isTyping });
  }

  /**
   * 세션 활동 시간 업데이트
   */
  private updateSessionActivity(sessionId: string): void {
    this.sessionLastActivity.set(sessionId, Date.now());
  }

  /**
   * 주기적 메모리 정리 시작
   */
  private startPeriodicCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupInactiveSessions();
    }, this.CLEANUP_INTERVAL_MS);

    this.logger.log(
      `🧹 Periodic cleanup started (every ${this.CLEANUP_INTERVAL_MS / 1000 / 60} minutes)`,
    );
  }

  /**
   * 비활성 세션 정리
   */
  private cleanupInactiveSessions(): void {
    const now = Date.now();
    const timeoutThreshold = now - this.SESSION_TIMEOUT_MS;
    let cleanedCount = 0;

    this.logger.log('🧹 Starting inactive session cleanup...');

    for (const [sessionId, lastActivity] of this.sessionLastActivity.entries()) {
      if (lastActivity < timeoutThreshold) {
        this.cleanupSession(sessionId);
        cleanedCount++;
      }
    }

    const memoryUsage = process.memoryUsage();
    this.logger.log(
      `🧹 Cleanup complete: ${cleanedCount} sessions removed. ` +
        `Memory: ${(memoryUsage.heapUsed / 1024 / 1024).toFixed(2)}MB / ${(memoryUsage.heapTotal / 1024 / 1024).toFixed(2)}MB`,
    );
  }

  /**
   * 세션 완전 정리
   */
  private cleanupSession(sessionId: string): void {
    this.logger.log(`🗑️ Cleaning up session: ${sessionId}`);

    this.sessions.delete(sessionId);
    this.conversationHistory.delete(sessionId);
    this.sessionLastActivity.delete(sessionId);
  }

  /**
   * Gateway 종료 시 정리
   */
  onModuleDestroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.logger.log('🧹 Periodic cleanup stopped');
    }
  }
}
