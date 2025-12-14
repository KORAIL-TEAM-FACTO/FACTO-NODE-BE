import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

/**
 * AI Conversation Service
 *
 * @description
 * - ChatGPT API 통합
 * - 자연스러운 대화 생성
 * - 음성 텍스트 변환 (STT) 및 텍스트 음성 변환 (TTS)
 */
@Injectable()
export class AIConversationService {
  private readonly logger = new Logger(AIConversationService.name);
  private readonly openai: OpenAI;
  private readonly model: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');

    if (!apiKey) {
      this.logger.warn(
        'OPENAI_API_KEY not configured. AI features will be disabled.',
      );
    }

    this.openai = new OpenAI({
      apiKey: apiKey || 'dummy-key',
    });

    this.model = this.configService.get<string>('OPENAI_MODEL') || 'gpt-4o';
  }

  /**
   * Generate AI response for conversation
   *
   * @param userMessage - 사용자 메시지
   * @param conversationHistory - 대화 히스토리
   * @param systemPrompt - 시스템 프롬프트 (AI 페르소나 설정)
   * @returns AI 응답
   */
  async generateResponse(
    userMessage: string,
    conversationHistory: { role: 'user' | 'assistant'; content: string }[] = [],
    systemPrompt?: string,
  ): Promise<string> {
    try {
      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        {
          role: 'system',
          content:
            systemPrompt ||
            '당신은 친절하고 전문적인 AI 전화 상담원입니다. 자연스럽고 명확하게 대화하세요.',
        },
        ...conversationHistory.map((msg) => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        })),
        {
          role: 'user',
          content: userMessage,
        },
      ];

      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages,
        temperature: 0.7,
        max_tokens: 500,
      });

      const response = completion.choices[0]?.message?.content || '';

      this.logger.log(
        `Generated AI response (${response.length} chars) for message: "${userMessage.substring(0, 50)}..."`,
      );

      return response;
    } catch (error) {
      this.logger.error('Failed to generate AI response', error);
      throw new Error('AI 서비스를 사용할 수 없습니다');
    }
  }

  /**
   * Transcribe audio to text using Whisper API
   *
   * @param audioBuffer - 오디오 파일 버퍼
   * @param language - 언어 코드 (기본값: 'ko')
   * @returns 변환된 텍스트
   */
  async transcribeAudio(
    audioBuffer: Buffer,
    language: string = 'ko',
  ): Promise<string> {
    try {
      // Convert Buffer to Uint8Array for Blob
      const uint8Array = new Uint8Array(audioBuffer);
      const blob = new Blob([uint8Array], { type: 'audio/webm' });

      // Create a File-like object from blob
      const file = new File([blob], 'audio.webm', {
        type: 'audio/webm',
      });

      const transcription = await this.openai.audio.transcriptions.create({
        file: file,
        model: 'whisper-1',
        language: language,
      });

      this.logger.log(
        `Transcribed audio: "${transcription.text.substring(0, 50)}..."`,
      );

      return transcription.text;
    } catch (error) {
      this.logger.error('Failed to transcribe audio', error);
      throw new Error('음성 인식에 실패했습니다');
    }
  }

  /**
   * Convert text to speech using TTS API
   *
   * @param text - 변환할 텍스트
   * @param voice - 음성 종류
   * @returns 오디오 버퍼
   */
  async textToSpeech(
    text: string,
    voice: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer' = 'nova',
  ): Promise<Buffer> {
    try {
      const mp3 = await this.openai.audio.speech.create({
        model: 'tts-1',
        voice: voice,
        input: text,
        speed: 1.0,
      });

      const buffer = Buffer.from(await mp3.arrayBuffer());

      this.logger.log(
        `Generated TTS audio (${buffer.length} bytes) for text: "${text.substring(0, 50)}..."`,
      );

      return buffer;
    } catch (error) {
      this.logger.error('Failed to generate TTS audio', error);
      throw new Error('음성 생성에 실패했습니다');
    }
  }

  /**
   * Analyze sentiment of the conversation
   */
  async analyzeSentiment(text: string): Promise<{
    sentiment: 'positive' | 'neutral' | 'negative';
    score: number;
  }> {
    try {
      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content:
              'Analyze the sentiment of the following text. Respond with JSON: {"sentiment": "positive|neutral|negative", "score": 0-1}',
          },
          {
            role: 'user',
            content: text,
          },
        ],
        response_format: { type: 'json_object' },
      });

      const result = JSON.parse(
        completion.choices[0]?.message?.content || '{}',
      );

      return {
        sentiment: result.sentiment || 'neutral',
        score: result.score || 0.5,
      };
    } catch (error) {
      this.logger.error('Failed to analyze sentiment', error);
      return { sentiment: 'neutral', score: 0.5 };
    }
  }
}
