import { RTCPeerConnection, RTCSessionDescription } from 'werift';
import { Logger } from '@nestjs/common';
import { AIConversationService } from '../../application/services/AIConversationService';

/**
 * AI Call Peer - 서버 측 WebRTC Peer
 *
 * @description
 * - 서버가 WebRTC Peer로 참여
 * - 클라이언트 음성을 실시간으로 수신
 * - AI 처리 후 음성 응답 전송
 */
export class AICallPeer {
  private readonly logger = new Logger(AICallPeer.name);
  private peerConnection: RTCPeerConnection;
  private audioChunks: Buffer[] = [];
  private isProcessing = false;

  constructor(
    private readonly sessionId: string,
    private readonly callId: string,
    private readonly aiConversationService: AIConversationService,
    private readonly onAudioResponseCallback: (audioBuffer: Buffer) => void,
  ) {
    this.initializePeerConnection();
  }

  /**
   * RTCPeerConnection 초기화
   */
  private initializePeerConnection(): void {
    this.peerConnection = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    });

    this.logger.log(`AICallPeer created for session ${this.sessionId}`);

    // Track 이벤트 핸들러 (클라이언트 오디오 수신)
    this.peerConnection.ontrack = ({ track, streams }) => {
      this.logger.log(`Received track: ${track.kind}`);

      if (track.kind === 'audio') {
        this.handleIncomingAudioTrack(track, streams);
      }
    };

    // ICE 연결 상태 모니터링
    this.peerConnection.oniceconnectionstatechange = () => {
      this.logger.log(
        `ICE connection state: ${this.peerConnection.iceConnectionState}`,
      );
    };

    // 연결 상태 모니터링
    this.peerConnection.onconnectionstatechange = () => {
      this.logger.log(
        `Connection state: ${this.peerConnection.connectionState}`,
      );
    };
  }

  /**
   * WebRTC Offer 처리 및 Answer 생성
   */
  async handleOffer(
    offer: RTCSessionDescriptionInit,
  ): Promise<RTCSessionDescriptionInit> {
    this.logger.log(`Handling offer for session ${this.sessionId}`);

    if (!offer.sdp || !offer.type) {
      throw new Error('Invalid offer: missing sdp or type');
    }

    // Remote Description 설정
    await this.peerConnection.setRemoteDescription(
      new RTCSessionDescription(
        offer.sdp,
        offer.type as 'offer' | 'answer',
      ),
    );

    // Answer 생성
    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);

    this.logger.log(`Answer created for session ${this.sessionId}`);

    return {
      type: answer.type,
      sdp: answer.sdp,
    };
  }

  /**
   * ICE Candidate 추가
   */
  async addIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    try {
      await this.peerConnection.addIceCandidate(candidate);
      this.logger.debug(`ICE candidate added for session ${this.sessionId}`);
    } catch (error) {
      this.logger.error(`Failed to add ICE candidate: ${error.message}`);
    }
  }

  /**
   * 수신된 오디오 트랙 처리
   */
  private handleIncomingAudioTrack(track: any, streams: any[]): void {
    this.logger.log(`Processing incoming audio track`);

    // RTP 패킷 수신
    track.onReceiveRtp.subscribe((rtp: any) => {
      // RTP payload를 버퍼로 변환
      const audioData = Buffer.from(rtp.payload);
      this.audioChunks.push(audioData);

      // 3초마다 AI 처리
      if (this.audioChunks.length >= 150 && !this.isProcessing) {
        // 48kHz, 20ms 패킷 기준 (150 packets ≈ 3초)
        this.processAudioWithAI();
      }
    });
  }

  /**
   * AI로 오디오 처리
   */
  private async processAudioWithAI(): Promise<void> {
    if (this.isProcessing || this.audioChunks.length === 0) {
      return;
    }

    this.isProcessing = true;
    const chunksToProcess = [...this.audioChunks];
    this.audioChunks = [];

    try {
      this.logger.log(`Processing ${chunksToProcess.length} audio chunks with AI`);

      // 오디오 버퍼 합치기
      const audioBuffer = Buffer.concat(chunksToProcess);

      // 1. STT (Speech to Text)
      const userMessage =
        await this.aiConversationService.transcribeAudio(audioBuffer);

      if (!userMessage || userMessage.trim().length === 0) {
        this.logger.log('No speech detected in audio');
        this.isProcessing = false;
        return;
      }

      this.logger.log(`User said: "${userMessage}"`);

      // 2. AI 응답 생성
      const aiResponse = await this.aiConversationService.generateResponse(
        userMessage,
        [],
        '당신은 친절한 AI 전화 상담원입니다. 간결하고 명확하게 답변하세요.',
      );

      this.logger.log(`AI response: "${aiResponse}"`);

      // 3. TTS (Text to Speech)
      const aiAudioBuffer =
        await this.aiConversationService.textToSpeech(aiResponse);

      this.logger.log(
        `AI audio generated: ${aiAudioBuffer.length} bytes`,
      );

      // 4. 콜백으로 오디오 전달 (WebSocket으로 클라이언트에게 전송)
      this.onAudioResponseCallback(aiAudioBuffer);
    } catch (error) {
      this.logger.error(`Failed to process audio with AI: ${error.message}`);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * AI 오디오를 WebRTC로 전송
   */
  async sendAudioToClient(audioBuffer: Buffer): Promise<void> {
    // TODO: werift로 RTP 패킷 생성 및 전송
    // 현재는 WebSocket을 통해 전송 (SignalingGateway에서 처리)
    this.logger.log(`Audio ready to send: ${audioBuffer.length} bytes`);
  }

  /**
   * ICE Candidate getter
   */
  get localCandidates(): RTCIceCandidate[] {
    return Array.from(this.peerConnection.iceGatheringState as any);
  }

  /**
   * 연결 종료
   */
  close(): void {
    this.logger.log(`Closing AICallPeer for session ${this.sessionId}`);
    this.peerConnection.close();
    this.audioChunks = [];
  }
}
