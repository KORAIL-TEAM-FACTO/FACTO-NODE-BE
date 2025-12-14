import { HttpException, HttpStatus } from '@nestjs/common';
import { CallErrorCode } from './CallErrorCode.enum';

/**
 * Call Already Active Exception
 *
 * @description 이미 활성 통화가 있을 때 발생하는 예외
 */
export class CallAlreadyActiveException extends HttpException {
  constructor(callerNumber?: string) {
    super(
      {
        code: CallErrorCode.CALL_ALREADY_ACTIVE,
        message: '이미 진행 중인 통화가 있습니다',
        detail: callerNumber,
      },
      HttpStatus.CONFLICT,
    );
  }
}
