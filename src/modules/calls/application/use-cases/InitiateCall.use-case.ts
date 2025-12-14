import { Injectable, Inject } from '@nestjs/common';
import type { IUseCase } from '../../../../shared/interfaces/use-case.interface';
import type { ICallRepository } from '../../domain/repositories/CallRepository.interface';
import { CALL_REPOSITORY } from '../../domain/repositories/CallRepository.interface';
import { Call } from '../../domain/entities/Call.entity';
import { CallAlreadyActiveException } from '../../domain/exceptions/CallAlreadyActiveException';
import { CallResponseDto } from '../dto/response/CallResponse.dto';

/**
 * Initiate Call Use Case
 *
 * @description
 * - 새로운 통화 시작
 * - 중복 통화 검사
 * - WebRTC 세션 생성
 */

interface InitiateCallRequest {
  callerNumber: string;
  receiverNumber?: string;
}

@Injectable()
export class InitiateCallUseCase
  implements IUseCase<InitiateCallRequest, CallResponseDto>
{
  constructor(
    @Inject(CALL_REPOSITORY)
    private readonly callRepository: ICallRepository,
  ) {}

  async execute(request: InitiateCallRequest): Promise<CallResponseDto> {
    // 1. Generate unique session ID
    const sessionId = crypto.randomUUID();

    // 2. Create call entity
    const call = Call.create(
      request.callerNumber,
      sessionId,
      request.receiverNumber,
    );

    // 3. Start ringing
    call.startRinging();

    // 4. Persist
    const savedCall = await this.callRepository.save(call);

    // 5. Return DTO
    return CallResponseDto.fromEntity(savedCall);
  }
}
