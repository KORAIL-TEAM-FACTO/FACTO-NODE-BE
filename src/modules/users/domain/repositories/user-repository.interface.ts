import { IRepository } from '../../../../shared/interfaces/repository.interface';
import { User } from '../entities/user.entity';

/**
 * User Repository Interface
 * Domain Layer에서 정의, Infrastructure Layer에서 구현
 */
export interface IUserRepository extends IRepository<User> {
  findByEmail(email: string): Promise<User | null>;
  findActiveUsers(): Promise<User[]>;
}

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');
