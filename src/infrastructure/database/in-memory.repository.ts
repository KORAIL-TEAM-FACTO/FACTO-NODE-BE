import { BaseEntity } from '../../shared/domain/base-entity';
import { IRepository } from '../../shared/interfaces/repository.interface';

/**
 * In-Memory Repository Base Class
 * 실제 프로젝트에서는 TypeORM, Prisma 등으로 대체
 */
export abstract class InMemoryRepository<T extends BaseEntity>
  implements IRepository<T>
{
  protected items: Map<string, T> = new Map();

  async findById(id: string): Promise<T | null> {
    return this.items.get(id) || null;
  }

  async findAll(): Promise<T[]> {
    return Array.from(this.items.values());
  }

  async save(entity: T): Promise<T> {
    this.items.set(entity.id, entity);
    return entity;
  }

  async update(entity: T): Promise<T> {
    if (!this.items.has(entity.id)) {
      throw new Error(`Entity with id ${entity.id} not found`);
    }
    this.items.set(entity.id, entity);
    return entity;
  }

  async delete(id: string): Promise<void> {
    this.items.delete(id);
  }
}
