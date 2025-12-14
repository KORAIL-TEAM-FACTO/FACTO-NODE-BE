import { HttpException, HttpStatus } from '@nestjs/common';
import { WelfareServiceErrorCode } from './WelfareServiceErrorCode.enum';

/**
 * API Request Failed Exception
 *
 * @description 외부 API 요청이 실패했을 때 발생하는 예외
 */
export class ApiRequestFailedException extends HttpException {
  constructor(reason?: string) {
    super(
      {
        code: WelfareServiceErrorCode.API_REQUEST_FAILED,
        message: '외부 API 요청이 실패했습니다',
        detail: reason,
      },
      HttpStatus.BAD_GATEWAY,
    );
  }
}
