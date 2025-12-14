import { Injectable } from '@nestjs/common';
import { IUserRepository } from '../../domain/repositories/user-repository.interface';
import { User } from '../../domain/entities/user.entity';
import { InMemoryRepository } from '../../../../infrastructure/database/in-memory.repository';

/**
 * User Repository Implementation
 * In-Memory 구현 (실제 프로젝트에서는 TypeORM, Prisma 등으로 교체)
 */
@Injectable()
export class UserRepository
  extends InMemoryRepository<User>
  implements IUserRepository
{
  async findByEmail(email: string): Promise<User | null> {
    const users = Array.from(this.items.values());
    return users.find((user) => user.email.value === email.toLowerCase()) || null;
  }

  async findActiveUsers(): Promise<User[]> {
    const users = Array.from(this.items.values());
    return users.filter((user) => user.isActive);
  }
}
