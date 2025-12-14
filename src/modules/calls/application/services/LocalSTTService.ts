import { Injectable, Logger } from '@nestjs/common';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

const whisper = require('whisper-node').whisper;

/**
 * Local Speech-to-Text Service
 *
 * @description
 * - 로컬 Whisper 모델로 STT 처리
 * - OpenAI API 사용 안 함
 */
@Injectable()
export class LocalSTTService {
  private readonly logger = new Logger(LocalSTTService.name);
  private readonly modelPath: string;

  constructor() {
    // Whisper 모델 경로 (base 모델 사용)
    this.modelPath = join(process.cwd(), 'models', 'ggml-base.bin');
  }

  /**
   * 오디오를 텍스트로 변환 (로컬 Whisper)
   *
   * @param audioBuffer - 오디오 버퍼
   * @param language - 언어 (기본값: 'ko')
   * @returns 변환된 텍스트
   */
  async transcribeAudio(
    audioBuffer: Buffer,
    language: string = 'ko',
  ): Promise<string> {
    let tempFilePath: string | null = null;

    try {
      // 임시 파일 생성
      tempFilePath = join(tmpdir(), `audio-${Date.now()}.wav`);
      await writeFile(tempFilePath, audioBuffer);

      this.logger.log(`Transcribing audio file: ${tempFilePath}`);

      // Whisper로 변환
      const transcript = await whisper(tempFilePath, {
        modelName: 'base',
        modelPath: this.modelPath,
        whisperOptions: {
          language: language,
          word_timestamps: false,
          gen_file_txt: false,
          gen_file_subtitle: false,
          gen_file_vtt: false,
        },
      });

      const text = transcript
        .map((segment: any) => segment.speech)
        .join(' ')
        .trim();

      this.logger.log(`Transcribed: "${text.substring(0, 50)}..."`);

      return text;
    } catch (error) {
      this.logger.error('Failed to transcribe audio locally', error);
      return '';
    } finally {
      // 임시 파일 삭제
      if (tempFilePath) {
        try {
          await unlink(tempFilePath);
        } catch (err) {
          this.logger.warn(`Failed to delete temp file: ${tempFilePath}`);
        }
      }
    }
  }

  /**
   * 모델이 다운로드되어 있는지 확인
   */
  async isModelAvailable(): Promise<boolean> {
    try {
      const fs = require('fs');
      return fs.existsSync(this.modelPath);
    } catch {
      return false;
    }
  }
}
