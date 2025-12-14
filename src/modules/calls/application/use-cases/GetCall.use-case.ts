import { Injectable, Inject } from '@nestjs/common';
import type { IUseCase } from '../../../../shared/interfaces/use-case.interface';
import type { ICallRepository } from '../../domain/repositories/CallRepository.interface';
import { CALL_REPOSITORY } from '../../domain/repositories/CallRepository.interface';
import { CallNotFoundException } from '../../domain/exceptions/CallNotFoundException';
import { CallResponseDto } from '../dto/response/CallResponse.dto';

/**
 * Get Call Use Case
 *
 * @description 통화 정보 조회
 */

@Injectable()
export class GetCallUseCase implements IUseCase<string, CallResponseDto> {
  constructor(
    @Inject(CALL_REPOSITORY)
    private readonly callRepository: ICallRepository,
  ) {}

  async execute(callId: string): Promise<CallResponseDto> {
    const call = await this.callRepository.findById(callId);

    if (!call) {
      throw new CallNotFoundException(callId);
    }

    return CallResponseDto.fromEntity(call);
  }
}
