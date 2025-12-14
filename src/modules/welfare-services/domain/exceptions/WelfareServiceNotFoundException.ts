import { HttpException, HttpStatus } from '@nestjs/common';
import { WelfareServiceErrorCode } from './WelfareServiceErrorCode.enum';

/**
 * Welfare Service Not Found Exception
 *
 * @description 복지 서비스를 찾을 수 없을 때 발생하는 예외
 */
export class WelfareServiceNotFoundException extends HttpException {
  constructor(serviceId?: string) {
    super(
      {
        code: WelfareServiceErrorCode.WELFARE_SERVICE_NOT_FOUND,
        message: '복지 서비스를 찾을 수 없습니다',
        detail: serviceId ? `Service ID: ${serviceId}` : undefined,
      },
      HttpStatus.NOT_FOUND,
    );
  }
}
