import { Inject, Injectable } from '@nestjs/common';
import { IUseCase } from '../../../../shared/interfaces/use-case.interface';
import type { IUserRepository } from '../../domain/repositories/user-repository.interface';
import { USER_REPOSITORY } from '../../domain/repositories/user-repository.interface';
import { EntityNotFoundException } from '../../../../common/exceptions/domain.exception';

/**
 * Delete User Use Case
 */
@Injectable()
export class DeleteUserUseCase implements IUseCase<string, void> {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(userId: string): Promise<void> {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new EntityNotFoundException('User', userId);
    }

    await this.userRepository.delete(userId);
  }
}
