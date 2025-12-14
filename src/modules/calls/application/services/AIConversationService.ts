import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { SearchWelfareServicesByKeywordUseCase } from '../../../welfare-services/application/use-cases/SearchWelfareServicesByKeyword.use-case';
import { SearchWelfareServicesByRegionUseCase } from '../../../welfare-services/application/use-cases/SearchWelfareServicesByRegion.use-case';
import { GetWelfareServiceUseCase } from '../../../welfare-services/application/use-cases/GetWelfareService.use-case';
import { WELFARE_SERVICE_REPOSITORY } from '../../../welfare-services/domain/repositories/WelfareServiceRepository.interface';
import type { IWelfareServiceRepository } from '../../../welfare-services/domain/repositories/WelfareServiceRepository.interface';

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
    @Inject(SearchWelfareServicesByRegionUseCase)
    private readonly searchByRegionUseCase: SearchWelfareServicesByRegionUseCase,
    @Inject(GetWelfareServiceUseCase)
    private readonly getWelfareServiceUseCase: GetWelfareServiceUseCase,
    @Inject(WELFARE_SERVICE_REPOSITORY)
    private readonly welfareRepository: IWelfareServiceRepository,
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
            '당신은 복지 서비스 검색 AI입니다. 음성 통화이므로 극도로 짧게 답변합니다.\n\n' +
            '중요: 도구 검색 결과가 있으면 무조건 그 결과만 말하세요. 절대 다른 얘기 하지 마세요.\n\n' +
            '응답 형식 (절대 지켜야 함):\n' +
            '"첫째 [서비스명], [부서명] [전화]. 둘째 [서비스명], [부서명] [전화]"\n\n' +
            '좋은 예시:\n' +
            '"첫째 홍천군 효행장려금, 홍천군청 노인복지과 033-1234. 둘째 노인성질환예방관리, 보건복지부 044-5678"\n\n' +
            '나쁜 예시 (절대 하지 마세요):\n' +
            '"노인으로서 드릴 수 있는 것은 경험과 지혜입니다..." (← 이런 일반론 절대 금지!)\n' +
            '"지역사회에 도움을 줄 수 있습니다..." (← 쓸데없는 얘기 금지!)\n\n' +
            '절대 금지:\n' +
            '- 검색 결과 외 다른 얘기\n' +
            '- 일반적인 조언이나 설명\n' +
            '- 특수문자 (1. 2. *, **, :, -, #)\n' +
            '- 3개 이상 나열\n\n' +
            '검색 결과가 있으면 무조건 그것만 말하세요!',
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
            description: '키워드로 복지 서비스를 검색합니다. 장애인, 노인, 아동, 청년, 출산, 교육 등의 복지 혜택을 찾을 때 사용하세요.',
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
        {
          type: 'function',
          function: {
            name: 'get_welfare_categories',
            description: '어떤 복지 서비스가 있는지 전체 카테고리 목록을 가져옵니다. 사용자가 "어떤 복지가 있어?", "복지 종류가 뭐야?" 같은 질문을 할 때 사용하세요.',
            parameters: {
              type: 'object',
              properties: {},
            },
          },
        },
        {
          type: 'function',
          function: {
            name: 'search_welfare_by_region',
            description: '특정 지역의 복지 서비스를 검색합니다. 사용자가 특정 시도나 시군구의 복지 혜택을 찾을 때 사용하세요.',
            parameters: {
              type: 'object',
              properties: {
                ctpvNm: {
                  type: 'string',
                  description: '시도명 (예: 서울특별시, 경기도, 부산광역시 등)',
                },
                sggNm: {
                  type: 'string',
                  description: '시군구명 (선택, 예: 강남구, 수원시, 해운대구 등)',
                },
              },
              required: ['ctpvNm'],
            },
          },
        },
        {
          type: 'function',
          function: {
            name: 'get_welfare_detail',
            description: '특정 복지 서비스의 상세 정보를 조회합니다. 신청 방법, 선정 기준, 지원 대상 등 자세한 정보를 얻을 때 사용하세요.',
            parameters: {
              type: 'object',
              properties: {
                serviceName: {
                  type: 'string',
                  description: '복지 서비스 이름 (이전 검색 결과에서 나온 정확한 서비스명)',
                },
              },
              required: ['serviceName'],
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

        let functionResult: any;

        // Function 실행
        if (functionName === 'search_welfare_services') {
          // 키워드로 복지 서비스 검색 (최대 2개만)
          const welfareServices = await this.searchWelfareUseCase.execute(
            functionArgs.keyword,
            2,
          );

          functionResult = welfareServices.map((service) => {
            // 문의처 정보 조합 (상세하게)
            const contactParts: string[] = [];
            if (service.bizChrDeptNm) contactParts.push(service.bizChrDeptNm); // 지자체 담당부서
            if (service.department) contactParts.push(service.department); // 중앙부처 부서
            if (service.organization) contactParts.push(service.organization); // 기관명
            if (service.contact) contactParts.push(service.contact); // 연락처

            const contactInfo = contactParts.length > 0
              ? contactParts.join(', ')
              : '문의처 정보 없음';

            return {
              serviceId: service.id,
              serviceName: service.serviceName,
              summary: service.aiSummary || service.serviceSummary,
              contact: contactInfo,
            };
          });
        } else if (functionName === 'get_welfare_categories') {
          // 복지 서비스 카테고리 목록 조회
          const { data: allServices } = await this.welfareRepository.findAll(1, 1000);

          // ctpvNm (지역) 목록 추출 (중복 제거)
          const regions = [...new Set(
            allServices
              .map((s) => s.ctpvNm)
              .filter((r) => r && r.trim().length > 0)
          )].slice(0, 10); // 상위 10개만

          // targetArray, interestThemeArray에서 키워드 추출
          const targets = new Set<string>();
          const themes = new Set<string>();

          allServices.forEach((service) => {
            // targetArray 파싱 (쉼표 또는 공백 구분)
            if (service.targetArray) {
              service.targetArray.split(/[,\s]+/).forEach((t) => {
                if (t.trim().length > 1) targets.add(t.trim());
              });
            }
            // interestThemeArray 파싱
            if (service.interestThemeArray) {
              service.interestThemeArray.split(/[,\s]+/).forEach((t) => {
                if (t.trim().length > 1) themes.add(t.trim());
              });
            }
          });

          functionResult = {
            regions: regions.slice(0, 10),
            targets: [...targets].slice(0, 15),
            themes: [...themes].slice(0, 15),
            totalServices: allServices.length,
          };
        } else if (functionName === 'search_welfare_by_region') {
          // 지역별 복지 서비스 검색 (최대 2개만)
          const services = await this.searchByRegionUseCase.execute(
            functionArgs.ctpvNm,
            functionArgs.sggNm,
          );

          functionResult = services.slice(0, 2).map((service) => {
            // 문의처 정보 조합
            const contactParts: string[] = [];
            if (service.bizChrDeptNm) contactParts.push(service.bizChrDeptNm);
            if (service.department) contactParts.push(service.department);
            if (service.organization) contactParts.push(service.organization);
            if (service.contact) contactParts.push(service.contact);

            const contactInfo = contactParts.length > 0
              ? contactParts.join(', ')
              : '문의처 정보 없음';

            return {
              serviceId: service.id,
              serviceName: service.serviceName,
              summary: service.aiSummary || service.serviceSummary,
              contact: contactInfo,
            };
          });
        } else if (functionName === 'get_welfare_detail') {
          // 서비스 이름으로 검색해서 첫 번째 결과의 상세 정보 조회
          const searchResults = await this.searchWelfareUseCase.execute(
            functionArgs.serviceName,
            1,
          );

          if (searchResults.length > 0) {
            const service = searchResults[0];
            functionResult = {
              serviceName: service.serviceName,
              summary: service.aiSummary || service.serviceSummary,
              applicationMethod: service.applicationMethodContent || '신청 방법 정보가 없습니다',
              supportTarget: service.supportTargetContent || '지원 대상 정보가 없습니다',
              selectionCriteria: service.selectionCriteria || '선정 기준 정보가 없습니다',
              serviceContent: service.serviceContent || '서비스 내용 정보가 없습니다',
              contact: service.bizChrDeptNm || service.department || '문의처 정보가 없습니다',
              region: service.ctpvNm && service.sggNm
                ? `${service.ctpvNm} ${service.sggNm}`
                : service.ctpvNm || '전국',
            };
          } else {
            functionResult = {
              error: '해당 서비스를 찾을 수 없습니다',
            };
          }
        } else {
          this.logger.warn(`Unknown function: ${functionName}`);
          return message?.content || '';
        }

        // Assistant의 tool_calls 메시지 추가
        messages.push({
          role: 'assistant',
          content: null,
          tool_calls: [
            {
              id: toolCall.id,
              type: 'function',
              function: {
                name: toolCall.function.name,
                arguments: toolCall.function.arguments,
              },
            },
          ],
        });

        // Tool의 응답 메시지 추가
        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(functionResult),
        });

        // 최종 응답 생성
        const finalCompletion = await this.openai.chat.completions.create({
          model: this.model,
          messages,
          temperature: 0.7,
          max_tokens: 500,
        });

        const finalResponse = finalCompletion.choices[0]?.message?.content || '';
        this.logger.log(`Generated final AI response with ${functionName} (${finalResponse.length} chars)`);
        return finalResponse;
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
   * Convert text to speech using OpenAI TTS API
   *
   * @param text - 변환할 텍스트
   * @param voice - 음성 종류
   * @returns 오디오 버퍼 (mp3)
   */
  async textToSpeech(
    text: string,
    voice: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer' = 'nova',
  ): Promise<Buffer> {
    try {
      this.logger.log(
        `Calling OpenAI TTS API: "${text.substring(0, 50)}..." with voice: ${voice}`,
      );

      const mp3 = await this.openai.audio.speech.create({
        model: 'tts-1',
        voice: voice,
        input: text,
      });

      const buffer = Buffer.from(await mp3.arrayBuffer());

      this.logger.log(
        `Generated TTS audio (${buffer.length} bytes) for text: "${text.substring(0, 50)}..."`,
      );

      return buffer;
    } catch (error) {
      this.logger.error('Failed to generate TTS audio', error);
      return Buffer.from([]);
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
