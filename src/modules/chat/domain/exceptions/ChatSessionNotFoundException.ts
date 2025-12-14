import { HttpException, HttpStatus } from '@nestjs/common';
import { ChatErrorCode } from './ChatErrorCode.enum';

/**
 * Chat Session Not Found Exception
 *
 * @description 채팅 세션을 찾을 수 없을 때 발생하는 예외
 */
export class ChatSessionNotFoundException extends HttpException {
  constructor(sessionId?: string) {
    super(
      {
        code: ChatErrorCode.SESSION_NOT_FOUND,
        message: '채팅 세션을 찾을 수 없습니다',
        detail: sessionId ? `Session ID: ${sessionId}` : undefined,
      },
      HttpStatus.NOT_FOUND,
    );
  }
}
