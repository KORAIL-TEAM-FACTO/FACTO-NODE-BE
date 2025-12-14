import { Injectable, Inject } from '@nestjs/common';
import type { IUseCase } from '../../../../shared/interfaces/use-case.interface';
import type { ICallRepository } from '../../domain/repositories/CallRepository.interface';
import { CALL_REPOSITORY } from '../../domain/repositories/CallRepository.interface';
import { CallNotFoundException } from '../../domain/exceptions/CallNotFoundException';
import { AIConversationService } from '../services/AIConversationService';

/**
 * Process AI Conversation Use Case
 *
 * @description
 * - 사용자 음성 메시지를 텍스트로 변환
 * - ChatGPT API로 응답 생성
 * - 응답을 음성으로 변환
 * - 대화 히스토리 저장
 */

interface ProcessAIConversationRequest {
  callId: string;
  audioBuffer: Buffer;
  systemPrompt?: string;
  mimeType?: string; // 오디오 MIME 타입 (audio/mp3, audio/webm 등)
}

interface ProcessAIConversationResponse {
  userMessage: string;
  aiResponse: string;
  audioBuffer: Buffer;
  sentiment?: {
    sentiment: 'positive' | 'neutral' | 'negative';
    score: number;
  };
}

@Injectable()
export class ProcessAIConversationUseCase
  implements
    IUseCase<
      ProcessAIConversationRequest,
      ProcessAIConversationResponse
    >
{
  constructor(
    @Inject(CALL_REPOSITORY)
    private readonly callRepository: ICallRepository,
    private readonly aiConversationService: AIConversationService,
  ) {}

  async execute(
    request: ProcessAIConversationRequest,
  ): Promise<ProcessAIConversationResponse> {
    // 1. Find call
    const call = await this.callRepository.findById(request.callId);

    if (!call) {
      throw new CallNotFoundException(request.callId);
    }

    // 2. Transcribe user audio to text (OpenAI Whisper API 사용)
    const userMessage = await this.aiConversationService.transcribeAudio(
      request.audioBuffer,
      'ko',
      request.mimeType || 'audio/webm',
    );

    // 3. Add to transcript
    call.addToTranscript('user', userMessage);

    // 4. Build conversation history
    const conversationHistory = this.buildConversationHistory(call.transcript);

    // 5. Generate AI response
    const aiResponse = await this.aiConversationService.generateResponse(
      userMessage,
      conversationHistory,
      request.systemPrompt,
    );

    // 6. Add AI response to transcript
    call.addToTranscript('ai', aiResponse);

    // 7. Analyze sentiment
    const sentiment =
      await this.aiConversationService.analyzeSentiment(userMessage);

    // 8. Update AI context
    call.updateAIContext({
      lastUserMessage: userMessage,
      lastAIResponse: aiResponse,
      sentiment,
      timestamp: new Date().toISOString(),
    });

    // 9. Convert AI response to speech (남성 목소리)
    const audioBuffer =
      await this.aiConversationService.textToSpeech(aiResponse, 'echo');

    // 10. Update call
    await this.callRepository.update(call);

    // 11. Return response
    return {
      userMessage,
      aiResponse,
      audioBuffer,
      sentiment,
    };
  }

  private buildConversationHistory(
    transcript: string[],
  ): { role: 'user' | 'assistant'; content: string }[] {
    return transcript
      .map((entry) => {
        const match = entry.match(/\[(.*?)\] (user|ai): (.*)/);
        if (!match) return null;

        const [, , speaker, content] = match;
        return {
          role: speaker === 'user' ? 'user' : ('assistant' as const),
          content,
        };
      })
      .filter((entry) => entry !== null) as {
      role: 'user' | 'assistant';
      content: string;
    }[];
  }
}
