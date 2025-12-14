import { HttpException, HttpStatus } from '@nestjs/common';
import { WelfareServiceErrorCode } from './WelfareServiceErrorCode.enum';

/**
 * Rate Limit Exceeded Exception
 *
 * @description API 요청 제한(429)이 발생했을 때 발생하는 예외
 */
export class RateLimitExceededException extends HttpException {
  constructor(apiName: string, detail?: string) {
    super(
      {
        code: WelfareServiceErrorCode.API_REQUEST_FAILED,
        message: `API 요청 제한 초과: ${apiName}`,
        detail: detail || 'API token quota exceeded',
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}
