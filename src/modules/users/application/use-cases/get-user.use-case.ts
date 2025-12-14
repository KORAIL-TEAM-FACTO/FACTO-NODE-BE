import { Inject, Injectable } from '@nestjs/common';
import { IUseCase } from '../../../../shared/interfaces/use-case.interface';
import type { IUserRepository } from '../../domain/repositories/user-repository.interface';
import { USER_REPOSITORY } from '../../domain/repositories/user-repository.interface';
import { UserResponseDto } from '../dto/user-response.dto';
import { EntityNotFoundException } from '../../../../common/exceptions/domain.exception';

/**
 * Get User Use Case
 */
@Injectable()
export class GetUserUseCase implements IUseCase<string, UserResponseDto> {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(userId: string): Promise<UserResponseDto> {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new EntityNotFoundException('User', userId);
    }

    return UserResponseDto.fromEntity(user);
  }
}
