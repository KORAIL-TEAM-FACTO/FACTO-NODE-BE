import { HttpException, HttpStatus } from '@nestjs/common';
import { CallErrorCode } from './CallErrorCode.enum';

/**
 * WebRTC Connection Failed Exception
 *
 * @description WebRTC 연결 실패 시 발생하는 예외
 */
export class WebRTCConnectionFailedException extends HttpException {
  constructor(reason?: string) {
    super(
      {
        code: CallErrorCode.WEBRTC_CONNECTION_FAILED,
        message: 'WebRTC 연결에 실패했습니다',
        detail: reason,
      },
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  }
}
