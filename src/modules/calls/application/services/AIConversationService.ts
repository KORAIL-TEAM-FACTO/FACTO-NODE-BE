import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { SearchWelfareServicesByKeywordUseCase } from '../../../welfare-services/application/use-cases/SearchWelfareServicesByKeyword.use-case';

/**
 * AI Conversation Service
 *
 * @description
 * - ChatGPT API 통합
 * - 자연스러운 대화 생성
 * - 음성 텍스트 변환 (STT) 및 텍스트 음성 변환 (TTS)
 * - 복지 서비스 검색 Function Calling
 */
@Injectable()
export class AIConversationService {
  private readonly logger = new Logger(AIConversationService.name);
  private readonly openai: OpenAI;
  private readonly model: string;

  constructor(
    private readonly configService: ConfigService,
    @Inject(SearchWelfareServicesByKeywordUseCase)
    private readonly searchWelfareUseCase: SearchWelfareServicesByKeywordUseCase,
  ) {
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
            `당신은 친절하고 전문적인 AI 전화 상담원입니다.

**응답 규칙:**
1. 음성으로 읽기 편하게 자연스럽고 간결하게 답변하세요
2. Markdown 문법(**, ##, - 등)을 사용하지 마세요
3. 숫자 리스트는 "첫째, 둘째, 셋째" 형식으로 표현하세요
4. 사용자 음성 인식 시 오타가 있을 수 있으니 문맥을 고려해서 이해하세요
5. 간단명료하게 핵심만 전달하세요 (최대 3-4문장)`,
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

      // Function Calling 정의
      const tools: OpenAI.Chat.ChatCompletionTool[] = [
        {
          type: 'function',
          function: {
            name: 'search_welfare_services',
            description: '복지 서비스를 검색합니다. 장애인, 노인, 아동, 청년 등의 복지 혜택을 찾을 때 사용하세요.',
            parameters: {
              type: 'object',
              properties: {
                keyword: {
                  type: 'string',
                  description: '검색 키워드 (예: 장애인, 노인, 아동, 출산, 교육 등)',
                },
              },
              required: ['keyword'],
            },
          },
        },
      ];

      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages,
        tools,
        tool_choice: 'auto',
        temperature: 0.7,
        max_tokens: 500,
      });

      const message = completion.choices[0]?.message;

      // Function Call이 있으면 실행
      if (message?.tool_calls && message.tool_calls.length > 0) {
        const toolCall = message.tool_calls[0];

        // Type guard for function tool call
        if (toolCall.type !== 'function') {
          this.logger.warn('Unsupported tool call type:', toolCall.type);
          return message?.content || '';
        }

        const functionName = toolCall.function.name;
        const functionArgs = JSON.parse(toolCall.function.arguments);

        this.logger.log(`AI requested function: ${functionName} with args: ${JSON.stringify(functionArgs)}`);

        if (functionName === 'search_welfare_services') {
          // 복지 서비스 검색 실행
          const welfareServices = await this.searchWelfareUseCase.execute(
            functionArgs.keyword,
            5,
          );

          // 검색 결과를 AI에게 전달하여 최종 응답 생성
          const functionResult = welfareServices.map((service) => ({
            serviceName: service.serviceName,
            summary: service.aiSummary || service.serviceSummary,
            applicationMethod: service.applicationMethodContent,
            contact: service.bizChrDeptNm || service.department,
          }));

          messages.push(message as any);
          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify(functionResult),
          } as any);

          // 최종 응답 생성
          const finalCompletion = await this.openai.chat.completions.create({
            model: this.model,
            messages,
            temperature: 0.7,
            max_tokens: 500,
          });

          const finalResponse = finalCompletion.choices[0]?.message?.content || '';
          this.logger.log(`Generated final AI response with welfare search (${finalResponse.length} chars)`);
          return finalResponse;
        }
      }

      // Function Call이 없으면 일반 응답
      const response = message?.content || '';

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
   * Convert audio to text using Whisper API
   *
   * @param audioBuffer - 오디오 버퍼
   * @param language - 언어 (ko/en)
   * @param mimeType - MIME 타입
   * @returns 변환된 텍스트
   */
  async transcribeAudio(
    audioBuffer: Buffer,
    language: string = 'ko',
    mimeType: string = 'audio/webm',
  ): Promise<string> {
    try {
      // 파일 확장자 결정
      let extension = 'webm';
      if (mimeType.includes('mp3')) extension = 'mp3';
      else if (mimeType.includes('wav')) extension = 'wav';
      else if (mimeType.includes('ogg')) extension = 'ogg';

      this.logger.log(
        `Calling Whisper API: ${(audioBuffer.length / 1024).toFixed(1)}KB, ${mimeType}`,
      );

      // OpenAI Whisper API 호출
      const response = await this.openai.audio.transcriptions.create({
        file: await this.toFile(audioBuffer, `audio.${extension}`),
        model: 'whisper-1',
        language: language,
      });

      this.logger.log(`Whisper result: "${response.text.substring(0, 100)}..."`);

      return response.text;
    } catch (error) {
      this.logger.error('Failed to transcribe audio with Whisper API', error);
      return '';
    }
  }

  /**
   * Buffer를 File 객체로 변환 (OpenAI SDK용)
   */
  private async toFile(buffer: Buffer, filename: string): Promise<any> {
    const { Blob } = require('buffer');
    const blob = new Blob([buffer]);
    return Object.assign(blob, { name: filename });
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
