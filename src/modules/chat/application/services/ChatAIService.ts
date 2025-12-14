import { Injectable, Logger } from '@nestjs/common';
import { AIConversationService } from '../../../calls/application/services/AIConversationService';

/**
 * Chat AI Service
 *
 * @description
 * - 채팅용 AI 서비스
 * - 기존 AIConversationService를 채팅에 맞게 래핑
 */
@Injectable()
export class ChatAIService {
  private readonly logger = new Logger(ChatAIService.name);

  constructor(
    private readonly aiConversationService: AIConversationService,
  ) {}

  /**
   * Generate AI response for chat message
   *
   * @param userMessage - 사용자 메시지
   * @param conversationHistory - 대화 히스토리
   * @returns AI 응답
   */
  async generateResponse(
    userMessage: string,
    conversationHistory: { role: 'user' | 'assistant'; content: string }[] = [],
  ): Promise<string> {
    try {
      const systemPrompt =
        '당신은 복지 서비스 검색 AI입니다. 텍스트 채팅이므로 명확하고 구조화된 답변을 제공합니다.\n\n' +
        '중요: 도구 검색 결과가 있으면 무조건 그 결과만 말하세요. 절대 다른 얘기 하지 마세요.\n\n' +
        '응답 형식 (절대 지켜야 함):\n' +
        '1. [서비스명]\n' +
        '   - 담당: [부서명]\n' +
        '   - 연락처: [전화번호]\n\n' +
        '2. [서비스명]\n' +
        '   - 담당: [부서명]\n' +
        '   - 연락처: [전화번호]\n\n' +
        '좋은 예시:\n' +
        '1. 홍천군 효행장려금\n' +
        '   - 담당: 홍천군청 노인복지과\n' +
        '   - 연락처: 033-1234\n\n' +
        '2. 노인성질환예방관리\n' +
        '   - 담당: 보건복지부\n' +
        '   - 연락처: 044-5678\n\n' +
        '절대 금지:\n' +
        '- 검색 결과 외 다른 얘기\n' +
        '- 일반적인 조언이나 설명\n' +
        '- 3개 이상 나열\n\n' +
        '검색 결과가 있으면 무조건 그것만 말하세요!';

      const response = await this.aiConversationService.generateResponse(
        userMessage,
        conversationHistory,
        systemPrompt,
      );

      this.logger.log(`Generated chat response (${response.length} chars)`);

      return response;
    } catch (error) {
      this.logger.error(`Failed to generate chat response: ${error.message}`);
      throw error;
    }
  }
}
