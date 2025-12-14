 import { Injectable, Inject } from '@nestjs/common';
import type { IUseCase } from '../../../../shared/interfaces/use-case.interface';
import type { ICallRepository } from '../../domain/repositories/CallRepository.interface';
import { CALL_REPOSITORY } from '../../domain/repositories/CallRepository.interface';
import { CallNotFoundException } from '../../domain/exceptions/CallNotFoundException';
import { CallResponseDto } from '../dto/response/CallResponse.dto';

/**
 * Connect Call Use Case
 *
 * @description
 * - 통화 연결 처리
 * - 상태를 CONNECTING → IN_PROGRESS로 변경
 * - 통화 시작 시간 기록
 */

interface ConnectCallRequest {
  callId: string;
}

@Injectable()
export class ConnectCallUseCase
  implements IUseCase<ConnectCallRequest, CallResponseDto>
{
  constructor(
    @Inject(CALL_REPOSITORY)
    private readonly callRepository: ICallRepository,
  ) {}

  async execute(request: ConnectCallRequest): Promise<CallResponseDto> {
    // 1. Find call
    const call = await this.callRepository.findById(request.callId);

    if (!call) {
      throw new CallNotFoundException(request.callId);
    }

    // 2. Start connecting
    call.startConnecting();

    // 3. Connect the call
    call.connect();

    // 4. Update
    const updatedCall = await this.callRepository.update(call);

    // 5. Return DTO
    return CallResponseDto.fromEntity(updatedCall);
  }
}
