import { HttpException, HttpStatus } from '@nestjs/common';
import { CallErrorCode } from './CallErrorCode.enum';

/**
 * Call Not Found Exception
 *
 * @description 통화를 찾을 수 없을 때 발생하는 예외
 */
export class CallNotFoundException extends HttpException {
  constructor(callId?: string) {
    super(
      {
        code: CallErrorCode.CALL_NOT_FOUND,
        message: '통화를 찾을 수 없습니다',
        detail: callId ? `Call ID: ${callId}` : undefined,
      },
      HttpStatus.NOT_FOUND,
    );
  }
}
