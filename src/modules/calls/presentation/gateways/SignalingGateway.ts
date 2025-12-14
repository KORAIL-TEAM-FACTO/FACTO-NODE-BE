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
import { Logger, Inject } from '@nestjs/common';
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
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(SignalingGateway.name);
  private readonly sessions = new Map<
    string,
    { socketId: string; peerId: string; callId?: string }
  >();
  private readonly aiPeers = new Map<string, AICallPeer>();

  constructor(
    private readonly aiConversationService: AIConversationService,
    @Inject(CALL_REPOSITORY)
    private readonly callRepository: ICallRepository,
  ) {}

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

    // Get session info
    const session = this.sessions.get(sessionId);
    if (!session || !session.callId) {
      this.logger.warn(`No session or callId found for ${sessionId}`);
      return;
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

    this.logger.log(
      `Received user audio for session ${sessionId} (${audioData.length} chars)`,
    );

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
        return;
      }

      // 🔇 최소 단어 길이 검증 (3글자 미만은 잡음일 가능성 높음 - 더 엄격하게)
      if (userMessage.trim().length < 3) {
        this.logger.log(
          `⚠️ Speech too short (${userMessage.trim().length} chars): "${userMessage}" - ignored`,
        );
        return;
      }

      // 🔇 반복되는 무의미한 문구 필터링
      const noisePatterns = [
        /^(아+|음+|어+|네+|예+|으+|흠+)$/i, // 추임새
        /시청.*감사/i, // 유튜브 엔딩
        /구독.*좋아요/i, // 유튜브 광고
        /배경.*잡음/i, // Whisper 프롬프트 누출
        /^(uh+|um+|ah+|hmm+)$/i, // 영어 추임새
        /^(끝|end|종료|stop)$/i, // 무의미한 종료 신호
      ];

      if (noisePatterns.some((pattern) => pattern.test(userMessage.trim()))) {
        this.logger.log(
          `⚠️ Noise pattern detected: "${userMessage}" - ignored`,
        );
        return;
      }

      this.logger.log(`✅ Valid speech: "${userMessage}"`);

      // 2. AI Response
      const aiResponse = await this.aiConversationService.generateResponse(
        userMessage,
        [],
        '당신은 친절한 AI 전화 상담원입니다. 간결하고 명확하게 답변하세요.',
      );

      this.logger.log(`🤖 AI response: "${aiResponse}"`);

      // 3. TTS
      const aiAudioBuffer =
        await this.aiConversationService.textToSpeech(aiResponse);

      this.logger.log(`AI audio: ${aiAudioBuffer.length} bytes`);

      // 4. Send to client
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
}
