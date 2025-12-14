import { Inject, Injectable } from '@nestjs/common';
import { IUseCase } from '../../../../shared/interfaces/use-case.interface';
import type { IUserRepository } from '../../domain/repositories/user-repository.interface';
import { USER_REPOSITORY } from '../../domain/repositories/user-repository.interface';
import { User } from '../../domain/entities/user.entity';
import { CreateUserDto } from '../dto/create-user.dto';
import { UserResponseDto } from '../dto/user-response.dto';

/**
 * Create User Use Case
 */
@Injectable()
export class CreateUserUseCase
  implements IUseCase<CreateUserDto, UserResponseDto>
{
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(request: CreateUserDto): Promise<UserResponseDto> {
    // 이메일 중복 체크
    const existingUser = await this.userRepository.findByEmail(request.email);
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // 도메인 엔티티 생성
    const user = User.create(request.name, request.email);

    // 저장
    const savedUser = await this.userRepository.save(user);

    // DTO로 변환하여 반환
    return UserResponseDto.fromEntity(savedUser);
  }
}
