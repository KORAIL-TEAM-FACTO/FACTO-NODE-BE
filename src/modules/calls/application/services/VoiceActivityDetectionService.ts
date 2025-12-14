import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { NonRealTimeVAD } from '@ricky0123/vad-node';

/**
 * Voice Activity Detection Service
 *
 * @description
 * - 로컬 VAD 라이브러리로 음성 감지
 * - 음성 구간 추출
 */
@Injectable()
export class VoiceActivityDetectionService implements OnModuleInit {
  private readonly logger = new Logger(VoiceActivityDetectionService.name);
  private vad: NonRealTimeVAD | null = null;

  async onModuleInit() {
    // VAD 초기화
    this.vad = await NonRealTimeVAD.new({
      positiveSpeechThreshold: 0.8,
      negativeSpeechThreshold: 0.5,
      preSpeechPadFrames: 10,
      redemptionFrames: 8,
    });
    this.logger.log('VAD initialized');
  }

  /**
   * 오디오 버퍼에서 음성 구간 감지
   *
   * @param audioBuffer - 오디오 데이터 (PCM 16bit)
   * @param sampleRate - 샘플레이트 (기본 16000Hz)
   * @returns 음성이 감지된 구간들의 배열
   */
  async detectVoiceActivity(
    audioBuffer: Buffer,
    sampleRate: number = 16000,
  ): Promise<any[]> {
    try {
      if (!this.vad) {
        this.logger.warn('VAD not initialized');
        return [];
      }

      // Buffer를 Float32Array로 변환 (VAD 입력 형식)
      const samples = this.bufferToFloat32Array(audioBuffer);

      this.logger.log(
        `Detecting voice activity in ${samples.length} samples at ${sampleRate}Hz`,
      );

      // VAD로 음성 구간 감지
      const segments: any[] = [];
      for await (const segment of this.vad.run(samples, sampleRate)) {
        segments.push(segment);
      }

      this.logger.log(`Detected ${segments.length} voice segments`);

      return segments;
    } catch (error) {
      this.logger.error('Failed to detect voice activity', error);
      return [];
    }
  }

  /**
   * Buffer를 Float32Array로 변환
   */
  private bufferToFloat32Array(buffer: Buffer): Float32Array {
    const samples = new Float32Array(buffer.length / 2);
    for (let i = 0; i < samples.length; i++) {
      // 16-bit PCM을 -1.0 ~ 1.0 범위로 변환
      samples[i] = buffer.readInt16LE(i * 2) / 32768.0;
    }
    return samples;
  }

  /**
   * Float32Array를 Buffer로 변환
   */
  private float32ArrayToBuffer(samples: Float32Array): Buffer {
    const buffer = Buffer.alloc(samples.length * 2);
    for (let i = 0; i < samples.length; i++) {
      // -1.0 ~ 1.0을 16-bit PCM으로 변환
      const value = Math.max(-1, Math.min(1, samples[i]));
      buffer.writeInt16LE(Math.round(value * 32767), i * 2);
    }
    return buffer;
  }

  /**
   * 음성 여부만 간단하게 체크
   *
   * @param audioBuffer - 오디오 데이터
   * @returns 음성이 포함되어 있는지 여부
   */
  async hasVoice(audioBuffer: Buffer): Promise<boolean> {
    try {
      const samples = this.bufferToFloat32Array(audioBuffer);

      // 간단한 에너지 기반 음성 감지
      let energy = 0;
      for (let i = 0; i < samples.length; i++) {
        energy += samples[i] * samples[i];
      }
      energy /= samples.length;

      const hasVoice = energy > 0.01; // 임계값

      this.logger.log(
        `Audio energy: ${energy.toFixed(6)}, has voice: ${hasVoice}`,
      );

      return hasVoice;
    } catch (error) {
      this.logger.error('Failed to check voice', error);
      return false;
    }
  }
}
