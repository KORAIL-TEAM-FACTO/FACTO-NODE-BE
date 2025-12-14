import { Injectable, Inject } from '@nestjs/common';
import type { IUseCase } from '../../../../shared/interfaces/use-case.interface';
import type { ICallRepository } from '../../domain/repositories/CallRepository.interface';
import { CALL_REPOSITORY } from '../../domain/repositories/CallRepository.interface';
import { CallNotFoundException } from '../../domain/exceptions/CallNotFoundException';
import { CallResponseDto } from '../dto/response/CallResponse.dto';

/**
 * End Call Use Case
 *
 * @description
 * - 통화 종료 처리
 * - 통화 시간 계산
 * - 종료 시간 기록
 */

interface EndCallRequest {
  callId: string;
}

@Injectable()
export class EndCallUseCase
  implements IUseCase<EndCallRequest, CallResponseDto>
{
  constructor(
    @Inject(CALL_REPOSITORY)
    private readonly callRepository: ICallRepository,
  ) {}

  async execute(request: EndCallRequest): Promise<CallResponseDto> {
    // 1. Find call
    const call = await this.callRepository.findById(request.callId);

    if (!call) {
      throw new CallNotFoundException(request.callId);
    }

    // 2. End the call
    call.end();

    // 3. Update
    const updatedCall = await this.callRepository.update(call);

    // 4. Return DTO
    return CallResponseDto.fromEntity(updatedCall);
  }
}
