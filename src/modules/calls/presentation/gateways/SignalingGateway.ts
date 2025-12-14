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
   * Send audio data to session (for AI processing)
   */
  @SubscribeMessage('audio-data')
  handleAudioData(
    @MessageBody()
    data: {
      sessionId: string;
      peerId: string;
      audioData: ArrayBuffer;
      timestamp: number;
    },
    @ConnectedSocket() client: Socket,
  ): void {
    const { sessionId } = data;
    // Forward to AI processing service
    client.to(sessionId).emit('audio-data', data);
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
