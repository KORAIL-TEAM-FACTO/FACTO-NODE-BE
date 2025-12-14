import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

/**
 * AI Summary Service
 *
 * @description
 * - OpenAI를 사용하여 복지 서비스 설명을 한 줄로 요약
 * - GPT 모델 사용 (gpt-4o 또는 gpt-3.5-turbo)
 */
@Injectable()
export class AISummaryService {
  private readonly logger = new Logger(AISummaryService.name);
  private readonly openai: OpenAI;
  private readonly model: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');

    if (!apiKey) {
      this.logger.warn('OPENAI_API_KEY not configured. AI summary will be disabled.');
    }

    this.openai = new OpenAI({
      apiKey: apiKey || 'dummy-key',
    });

    this.model = this.configService.get<string>('OPENAI_MODEL') || 'gpt-4o';
  }

  /**
   * 복지 서비스 설명을 한 줄로 요약 (토큰 최적화)
   *
   * @param serviceName - 서비스 이름
   * @param serviceSummary - 서비스 요약
   * @returns AI가 생성한 한 줄 요약
   */
  async summarizeService(
    serviceName: string,
    serviceSummary?: string,
  ): Promise<string> {
    try {
      const apiKey = this.configService.get<string>('OPENAI_API_KEY');

      if (!apiKey) {
        this.logger.warn('OPENAI_API_KEY not configured. Using fallback summary.');
        return this.createFallbackSummary(serviceName, serviceSummary);
      }

      // 토큰 절약을 위해 요약만 사용 (상세 내용 제외)
      const inputText = serviceSummary || serviceName;

      // 입력도 100자로 제한
      const truncatedInput = inputText.length > 100 ? inputText.substring(0, 100) : inputText;

      this.logger.log(`AI 요약: ${serviceName}`);

      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: '복지 서비스를 1문장으로 간결하게 요약하세요. 대상자와 지원 내용만 포함하세요.',
          },
          {
            role: 'user',
            content: `${serviceName}: ${truncatedInput}`,
          },
        ],
        max_tokens: 60, // 짧게
        temperature: 0.3, // 일관성 향상
      });

      const summary = response.choices[0]?.message?.content?.trim();

      if (!summary) {
        this.logger.warn('AI returned empty summary. Using fallback.');
        return this.createFallbackSummary(serviceName, serviceSummary);
      }

      this.logger.log(`Generated AI summary (${summary.length} chars) for: ${serviceName}`);
      return summary;
    } catch (error) {
      this.logger.error('Failed to generate AI summary', error);
      return this.createFallbackSummary(serviceName, serviceSummary);
    }
  }

  /**
   * Summarize multiple services in batch
   *
   * @param services - 복지 서비스 목록
   * @returns AI 요약 목록
   */
  async summarizeServicesBatch(
    services: Array<{
      serviceName: string;
      serviceSummary?: string;
    }>,
  ): Promise<string[]> {
    const summaries: string[] = [];

    for (const service of services) {
      const summary = await this.summarizeService(
        service.serviceName,
        service.serviceSummary,
      );
      summaries.push(summary);

      // Rate limiting: wait 500ms between requests
      await this.sleep(500);
    }

    return summaries;
  }


  /**
   * Create fallback summary when AI is unavailable
   */
  private createFallbackSummary(serviceName: string, serviceSummary?: string): string {
    if (serviceSummary && serviceSummary.length > 0) {
      // Truncate to 100 characters
      return serviceSummary.length > 100
        ? serviceSummary.substring(0, 97) + '...'
        : serviceSummary;
    }

    return `${serviceName} 복지 서비스`;
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
