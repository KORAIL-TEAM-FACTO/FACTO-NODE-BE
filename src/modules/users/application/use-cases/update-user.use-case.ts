import { Inject, Injectable } from '@nestjs/common';
import { IUseCase } from '../../../../shared/interfaces/use-case.interface';
import type { IUserRepository } from '../../domain/repositories/user-repository.interface';
import { USER_REPOSITORY } from '../../domain/repositories/user-repository.interface';
import { UserResponseDto } from '../dto/user-response.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { EntityNotFoundException } from '../../../../common/exceptions/domain.exception';

interface UpdateUserRequest {
  userId: string;
  data: UpdateUserDto;
}

/**
 * Update User Use Case
 */
@Injectable()
export class UpdateUserUseCase
  implements IUseCase<UpdateUserRequest, UserResponseDto>
{
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(request: UpdateUserRequest): Promise<UserResponseDto> {
    const user = await this.userRepository.findById(request.userId);

    if (!user) {
      throw new EntityNotFoundException('User', request.userId);
    }

    // 도메인 로직을 통한 업데이트
    if (request.data.name) {
      user.updateName(request.data.name);
    }

    if (request.data.email) {
      user.updateEmail(request.data.email);
    }

    const updatedUser = await this.userRepository.update(user);

    return UserResponseDto.fromEntity(updatedUser);
  }
}
