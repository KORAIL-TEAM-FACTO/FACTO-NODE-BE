import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { GetChatHistoryUseCase } from '../../application/use-cases/GetChatHistory.use-case';
import { ChatMessageResponse } from '../../application/dto/response/ChatMessageResponse.dto';

/**
 * Chat Controller
 *
 * @description
 * - 채팅 REST API
 * - 히스토리 조회 등
 */
@ApiTags('chat')
@Controller('chat')
export class ChatController {
  constructor(
    private readonly getChatHistoryUseCase: GetChatHistoryUseCase,
  ) {}

  /**
   * 채팅 히스토리 조회
   */
  @Get('sessions/:sessionId/messages')
  @ApiOperation({ summary: '채팅 히스토리 조회' })
  @ApiParam({
    name: 'sessionId',
    description: '세션 ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: '채팅 히스토리 조회 성공',
    type: [ChatMessageResponse],
  })
  async getChatHistory(
    @Param('sessionId') sessionId: string,
  ): Promise<{ messages: ChatMessageResponse[] }> {
    const messages = await this.getChatHistoryUseCase.execute(sessionId, 50);
    return { messages };
  }
}
