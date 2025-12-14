import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, Inject, OnModuleDestroy } from '@nestjs/common';
import { AICallPeer } from '../../infrastructure/webrtc/AICallPeer';
import { AIConversationService } from '../../application/services/AIConversationService';
import type { ICallRepository } from '../../domain/repositories/CallRepository.interface';
import { CALL_REPOSITORY } from '../../domain/repositories/CallRepository.interface';

/**
 * WebRTC Signaling Gateway
 *
 * @description
 * - WebRTC Peer 간 시그널링 처리
 * - 서버 측 AI Peer 관리
 * - ICE Candidate 교환
 * - SDP Offer/Answer 교환
 * - Socket.IO 기반 실시간 통신
 */
@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: '/signaling',
})
export class SignalingGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnModuleDestroy
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(SignalingGateway.name);
  private readonly sessions = new Map<
    string,
    { socketId: string; peerId: string; callId?: string }
  >();
  private readonly aiPeers = new Map<string, AICallPeer>();
  private readonly greetingSent = new Set<string>(); // 인사말 전송 여부 추적
  private readonly processingAudio = new Map<string, boolean>(); // 세션별 오디오 처리 중 플래그
  private readonly conversationHistory = new Map<
    string,
    { role: 'user' | 'assistant'; content: string }[]
  >(); // 세션별 대화 히스토리
  private readonly sessionLastActivity = new Map<string, number>(); // 세션별 마지막 활동 시간 (timestamp)
  private readonly SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30분 타임아웃
  private readonly CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5분마다 정리
  private cleanupInterval?: NodeJS.Timeout;

  constructor(
    private readonly aiConversationService: AIConversationService,
    @Inject(CALL_REPOSITORY)
    private readonly callRepository: ICallRepository,
  ) {
    // 주기적 메모리 정리 시작
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
        this.sessions.delete(sessionId);

        // Close AI Peer
        const aiPeer = this.aiPeers.get(sessionId);
        if (aiPeer) {
          aiPeer.close();
          this.aiPeers.delete(sessionId);
          this.logger.log(`AI Peer closed for session ${sessionId}`);
        }

        // Clear greeting sent flag
        this.greetingSent.delete(sessionId);

        // Clear processing flag
        this.processingAudio.delete(sessionId);

        // Clear conversation history
        this.conversationHistory.delete(sessionId);

        // Notify peer about disconnection
        this.server.to(sessionId).emit('peer-disconnected', {
          peerId: session.peerId,
        });
        break;
      }
    }
  }

  /**
   * Join a call session
   */
  @SubscribeMessage('join-session')
  handleJoinSession(
    @MessageBody() data: { sessionId: string; peerId: string; callId?: string },
    @ConnectedSocket() client: Socket,
  ): void {
    const { sessionId, peerId, callId } = data;

    this.logger.log(`Peer ${peerId} joining session ${sessionId}`);

    // Join room
    client.join(sessionId);

    // Store session info
    this.sessions.set(sessionId, {
      socketId: client.id,
      peerId,
      callId,
    });

    // 활동 시간 업데이트
    this.updateSessionActivity(sessionId);

    // Notify others in the room
    client.to(sessionId).emit('peer-joined', { peerId });

    client.emit('joined-session', { sessionId, peerId });
  }

  /**
   * Handle WebRTC Offer
   */
  @SubscribeMessage('offer')
  async handleOffer(
    @MessageBody()
    data: {
      sessionId: string;
      peerId: string;
      offer: RTCSessionDescriptionInit;
    },
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    const { sessionId, peerId, offer } = data;

    this.logger.log(`Received offer from ${peerId} in session ${sessionId}`);

    // Get session info or create new one
    let session = this.sessions.get(sessionId);

    // If session doesn't exist, try to get callId from connect endpoint
    // This is a fallback for when join-session wasn't called
    if (!session) {
      this.logger.warn(`Session not found for ${sessionId}, creating fallback session`);
      client.join(sessionId);
      session = {
        socketId: client.id,
        peerId,
        callId: sessionId, // Use sessionId as callId fallback
      };
      this.sessions.set(sessionId, session);
    }

    if (!session.callId) {
      this.logger.warn(`No callId found for ${sessionId}, using sessionId as fallback`);
      session.callId = sessionId;
    }

    // Create AI Peer for this session
    const aiPeer = new AICallPeer(
      sessionId,
      session.callId,
      this.aiConversationService,
      (audioBuffer: Buffer) => {
        // AI 응답 오디오를 클라이언트에게 전송
        this.server.to(sessionId).emit('ai-audio-response', {
          audioData: audioBuffer.toString('base64'),
          timestamp: Date.now(),
        });
      },
    );

    // Store AI Peer
    this.aiPeers.set(sessionId, aiPeer);

    try {
      // Process offer and generate answer
      const answer = await aiPeer.handleOffer(offer);

      // Send answer back to client
      client.emit('answer', {
        peerId: 'ai-server',
        answer,
      });

      this.logger.log(`AI Peer answer sent for session ${sessionId}`);

      // ICE 연결 안정화 대기 후 인사말 전송 (세션당 한 번만)
      if (!this.greetingSent.has(sessionId)) {
        this.greetingSent.add(sessionId);

        setTimeout(async () => {
          const greetingMessage = '안녕하세요';
          this.logger.log(`Sending greeting message to session ${sessionId}`);

          try {
            const greetingAudio = await this.aiConversationService.textToSpeech(
              greetingMessage,
              'echo',
            );

            this.server.to(sessionId).emit('ai-audio-response', {
              audioData: greetingAudio.toString('base64'),
              timestamp: Date.now(),
            });

            this.logger.log(`✅ Greeting sent to session ${sessionId}`);
          } catch (error) {
            this.logger.error(`Failed to send greeting: ${error.message}`);
          }
        }, 2000); // ICE 연결 안정화 대기
      }
    } catch (error) {
      this.logger.error(`Failed to handle offer: ${error.message}`);
      client.emit('error', {
        message: 'Failed to establish connection with AI server',
      });
    }
  }

  /**
   * Handle WebRTC Answer
   */
  @SubscribeMessage('answer')
  handleAnswer(
    @MessageBody()
    data: {
      sessionId: string;
      peerId: string;
      answer: RTCSessionDescriptionInit;
    },
    @ConnectedSocket() client: Socket,
  ): void {
    const { sessionId, peerId, answer } = data;

    this.logger.log(`Received answer from ${peerId} in session ${sessionId}`);

    // Forward answer to peers in the session
    client.to(sessionId).emit('answer', { peerId, answer });
  }

  /**
   * Handle ICE Candidate
   */
  @SubscribeMessage('ice-candidate')
  async handleIceCandidate(
    @MessageBody()
    data: {
      sessionId: string;
      peerId: string;
      candidate: RTCIceCandidateInit;
    },
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    const { sessionId, peerId, candidate } = data;

    this.logger.debug(
      `Received ICE candidate from ${peerId} in session ${sessionId}`,
    );

    // Add ICE candidate to AI Peer if exists
    const aiPeer = this.aiPeers.get(sessionId);
    if (aiPeer) {
      await aiPeer.addIceCandidate(candidate);
    }

    // Forward ICE candidate to peers in the session
    client.to(sessionId).emit('ice-candidate', { peerId, candidate });
  }

  /**
   * Leave a call session
   */
  @SubscribeMessage('leave-session')
  handleLeaveSession(
    @MessageBody() data: { sessionId: string; peerId: string },
    @ConnectedSocket() client: Socket,
  ): void {
    const { sessionId, peerId } = data;

    this.logger.log(`Peer ${peerId} leaving session ${sessionId}`);

    // Leave room
    client.leave(sessionId);

    // Remove from sessions
    this.sessions.delete(sessionId);

    // Clear greeting sent flag
    this.greetingSent.delete(sessionId);

    // Clear processing flag
    this.processingAudio.delete(sessionId);

    // Clear conversation history
    this.conversationHistory.delete(sessionId);

    // Notify others
    client.to(sessionId).emit('peer-left', { peerId });

    client.emit('left-session', { sessionId });
  }

  /**
   * Handle user audio (WebM from browser)
   */
  @SubscribeMessage('user-audio')
  async handleUserAudio(
    @MessageBody()
    data: {
      sessionId: string;
      callId: string;
      audioData: string; // base64
      mimeType: string;
    },
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    const { sessionId, callId, audioData, mimeType } = data;

    // 🔒 이미 처리 중이면 무시 (중복 요청 방지)
    if (this.processingAudio.get(sessionId)) {
      this.logger.log(
        `⚠️ Already processing audio for session ${sessionId} - ignoring duplicate request`,
      );
      return;
    }

    this.logger.log(
      `Received user audio for session ${sessionId} (${audioData.length} chars)`,
    );

    // 🔒 처리 시작 - 플래그 설정
    this.processingAudio.set(sessionId, true);

    // 활동 시간 업데이트
    this.updateSessionActivity(sessionId);

    try {
      // Base64 → Buffer
      const audioBuffer = Buffer.from(audioData, 'base64');

      this.logger.log(`Audio buffer: ${audioBuffer.length} bytes`);

      // 🔇 음성 데이터 크기 검증 (너무 작으면 잡음)
      if (audioBuffer.length < 20000) {
        // 20KB 미만은 무시 (클라이언트와 동일한 임계값)
        this.logger.log(
          `⚠️ Audio too small (${(audioBuffer.length / 1024).toFixed(1)}KB < 20KB) - ignored`,
        );
        await this.sendFeedbackResponse(
          sessionId,
          '죄송합니다, 잘 들리지 않았어요. 다시 말씀해주시겠어요?',
        );
        return;
      }

      this.logger.log(
        `🎙️ Processing audio: ${(audioBuffer.length / 1024).toFixed(1)}KB`,
      );

      // 1. STT
      const userMessage =
        await this.aiConversationService.transcribeAudio(audioBuffer);

      // 🔇 음성 인식 결과 검증
      if (!userMessage || userMessage.trim().length === 0) {
        this.logger.log('⚠️ No speech detected - empty transcription');
        await this.sendFeedbackResponse(
          sessionId,
          '죄송합니다, 말씀을 잘 못 알아들었어요. 다시 한번 말씀해주시겠어요?',
        );
        return;
      }

      // 🔇 최소 단어 길이 검증 (3글자 미만은 잡음일 가능성 높음 - 더 엄격하게)
      if (userMessage.trim().length < 3) {
        this.logger.log(
          `⚠️ Speech too short (${userMessage.trim().length} chars): "${userMessage}" - ignored`,
        );
        await this.sendFeedbackResponse(
          sessionId,
          '죄송합니다, 잘 들리지 않았어요. 다시 말씀해주시겠어요?',
        );
        return;
      }

      // 🔇 반복되는 무의미한 문구 필터링
      const noisePatterns = [
        /^(아+|음+|어+|네+|예+|으+|흠+)$/i, // 추임새
        /시청.*감사/i, // 유튜브 엔딩
        /구독.*좋아요/i, // 유튜브 광고
        /좋아요.*구독/i, // 유튜브 광고 (순서 바뀐 버전)
        /thumbs.*up.*subscribe/i, // 영어 유튜브
        /subscribe.*like/i, // 영어 유튜브
        /영상.*편집.*감사/i, // 유튜브 크레딧
        /뉴스.*입니다/i, // 뉴스 오프닝
        /mbc|sbs|kbs|jtbc/i, // 방송사명
        /배경.*잡음/i, // Whisper 프롬프트 누출
        /^(uh+|um+|ah+|hmm+)$/i, // 영어 추임새
        /^(끝|end|종료|stop)$/i, // 무의미한 종료 신호
        /promoting.*video/i, // 영어 프로모션
      ];

      if (noisePatterns.some((pattern) => pattern.test(userMessage.trim()))) {
        this.logger.log(
          `⚠️ Noise pattern detected: "${userMessage}" - ignored`,
        );
        await this.sendFeedbackResponse(
          sessionId,
          '죄송합니다, 말씀을 잘 못 알아들었어요. 다시 한번 말씀해주시겠어요?',
        );
        return;
      }

      this.logger.log(`✅ Valid speech: "${userMessage}"`);

      // 2. 대화 히스토리 가져오기 (없으면 빈 배열)
      const history = this.conversationHistory.get(sessionId) || [];

      // 3. AI Response (대화 히스토리 포함)
      const aiResponse = await this.aiConversationService.generateResponse(
        userMessage,
        history,
        '당신은 친절한 AI 전화 상담원입니다. 간결하고 명확하게 답변하세요.',
      );

      this.logger.log(`🤖 AI response: "${aiResponse}"`);

      // 4. 대화 히스토리 업데이트 (최근 10개만 유지)
      history.push({ role: 'user', content: userMessage });
      history.push({ role: 'assistant', content: aiResponse });

      // 최근 10개 턴(20개 메시지)만 유지
      if (history.length > 20) {
        history.splice(0, history.length - 20);
      }

      this.conversationHistory.set(sessionId, history);
      this.logger.log(`💬 Conversation history updated: ${history.length} messages`);

      // 5. TTS (남성 목소리 - echo)
      const aiAudioBuffer =
        await this.aiConversationService.textToSpeech(aiResponse, 'echo');

      this.logger.log(`AI audio: ${aiAudioBuffer.length} bytes`);

      // 6. Send to client
      this.server.to(sessionId).emit('ai-audio-response', {
        audioData: aiAudioBuffer.toString('base64'),
        timestamp: Date.now(),
      });

      this.logger.log('✅ AI response sent to client');
    } catch (error) {
      this.logger.error(`Failed to process user audio: ${error.message}`);
      client.emit('error', {
        message: 'Failed to process audio',
      });
    } finally {
      // 🔒 처리 완료 - 플래그 해제
      this.processingAudio.set(sessionId, false);
      this.logger.log(`🔓 Audio processing completed for session ${sessionId}`);
    }
  }

  /**
   * Send feedback response when noise/invalid audio detected
   */
  private async sendFeedbackResponse(
    sessionId: string,
    message: string,
  ): Promise<void> {
    try {
      // TTS로 피드백 메시지 생성 (남성 목소리 - echo)
      const feedbackAudio =
        await this.aiConversationService.textToSpeech(message, 'echo');

      // 클라이언트에 전송
      this.server.to(sessionId).emit('ai-audio-response', {
        audioData: feedbackAudio.toString('base64'),
        timestamp: Date.now(),
      });

      this.logger.log(`📢 Sent feedback: "${message}"`);
    } catch (error) {
      this.logger.error(
        `Failed to send feedback response: ${error.message}`,
      );
    }
  }

  /**
   * Broadcast message to session
   */
  broadcastToSession(sessionId: string, event: string, data: unknown): void {
    this.server.to(sessionId).emit(event, data);
  }

  /**
   * Send message to specific peer
   */
  sendToPeer(socketId: string, event: string, data: unknown): void {
    this.server.to(socketId).emit(event, data);
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
   * 비활성 세션 정리 (30분 이상 활동 없는 세션)
   */
  private cleanupInactiveSessions(): void {
    const now = Date.now();
    const timeoutThreshold = now - this.SESSION_TIMEOUT_MS;
    let cleanedCount = 0;

    this.logger.log('🧹 Starting inactive session cleanup...');

    // 모든 세션 검사
    for (const [sessionId, lastActivity] of this.sessionLastActivity.entries()) {
      if (lastActivity < timeoutThreshold) {
        // 타임아웃된 세션 정리
        this.cleanupSession(sessionId);
        cleanedCount++;
      }
    }

    // 메모리 사용량 로깅
    const memoryUsage = process.memoryUsage();
    this.logger.log(
      `🧹 Cleanup complete: ${cleanedCount} sessions removed. ` +
        `Memory: ${(memoryUsage.heapUsed / 1024 / 1024).toFixed(2)}MB / ${(memoryUsage.heapTotal / 1024 / 1024).toFixed(2)}MB`,
    );
  }

  /**
   * 세션 완전 정리 (모든 맵에서 제거)
   */
  private cleanupSession(sessionId: string): void {
    this.logger.log(`🗑️ Cleaning up session: ${sessionId}`);

    // AI Peer 종료
    const aiPeer = this.aiPeers.get(sessionId);
    if (aiPeer) {
      aiPeer.close();
      this.aiPeers.delete(sessionId);
    }

    // 모든 맵에서 제거
    this.sessions.delete(sessionId);
    this.greetingSent.delete(sessionId);
    this.processingAudio.delete(sessionId);
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
