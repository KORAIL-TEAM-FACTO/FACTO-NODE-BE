import { RTCPeerConnection, RTCSessionDescription } from 'werift';
import { Logger } from '@nestjs/common';
import { AIConversationService } from '../../application/services/AIConversationService';
import * as wav from 'wav';

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
    // 연결되면 초기 인사말 전송
    this.sendInitialGreeting();
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
   *
   * NOTE: RTP 패킷 처리는 비활성화됨
   * - SignalingGateway의 'user-audio' 이벤트로 음성 처리
   * - 여기서 처리하면 중복 응답 발생
   */
  private handleIncomingAudioTrack(track: any, streams: any[]): void {
    this.logger.log(`Audio track received (RTP processing disabled - using WebSocket instead)`);

    // ❌ RTP 패킷 처리 비활성화
    // SignalingGateway에서 'user-audio' 이벤트로 처리하므로 여기서는 처리하지 않음
    // track.onReceiveRtp.subscribe((rtp: any) => {
    //   const audioData = Buffer.from(rtp.payload);
    //   this.audioChunks.push(audioData);
    //   if (this.audioChunks.length >= 150 && !this.isProcessing) {
    //     this.processAudioWithAI();
    //   }
    // });
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
      const rawAudioBuffer = Buffer.concat(chunksToProcess);

      this.logger.log(`Raw audio buffer: ${rawAudioBuffer.length} bytes`);

      // RTP 패킷을 WAV 파일로 변환
      const wavBuffer = await this.convertToWav(rawAudioBuffer);

      this.logger.log(`WAV buffer created: ${wavBuffer.length} bytes`);

      // 1. STT (Speech to Text)
      const userMessage =
        await this.aiConversationService.transcribeAudio(wavBuffer);

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

      // 3. TTS (Text to Speech) - 남성 목소리
      const aiAudioBuffer =
        await this.aiConversationService.textToSpeech(aiResponse, 'echo');

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
   * RTP 페이로드를 WAV 파일로 변환
   */
  private convertToWav(rawBuffer: Buffer): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const writer = new wav.Writer({
        sampleRate: 48000,  // WebRTC 기본 샘플레이트
        channels: 1,        // 모노
        bitDepth: 16,       // 16-bit PCM
      });

      const chunks: Buffer[] = [];

      writer.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
      });

      writer.on('end', () => {
        const wavBuffer = Buffer.concat(chunks);
        this.logger.debug(`WAV conversion complete: ${wavBuffer.length} bytes`);
        resolve(wavBuffer);
      });

      writer.on('error', (error) => {
        this.logger.error(`WAV conversion error: ${error.message}`);
        reject(error);
      });

      // PCM 데이터 쓰기
      writer.write(rawBuffer);
      writer.end();
    });
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
   * 초기 인사말 전송
   */
  private async sendInitialGreeting(): Promise<void> {
    try {
      // 인사말은 SignalingGateway에서 처리하므로 여기서는 주석 처리
      // setTimeout(async () => {
      //   this.logger.log('Sending initial greeting...');
      //   const greeting = '안녕하세요! AI 상담원입니다. 무엇을 도와드릴까요?';
      //   const audioBuffer = await this.aiConversationService.textToSpeech(greeting, 'echo');
      //   this.logger.log(`Initial greeting audio generated: ${audioBuffer.length} bytes`);
      //   this.onAudioResponseCallback(audioBuffer);
      // }, 2000);
    } catch (error) {
      this.logger.error(`Failed to send initial greeting: ${error.message}`);
    }
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
