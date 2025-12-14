import { BaseEntity } from '../domain/base-entity';

/**
 * Generic Repository Interface
 */
export interface IRepository<T extends BaseEntity> {
  findById(id: string): Promise<T | null>;
  findAll(): Promise<T[]>;
  save(entity: T): Promise<T>;
  update(entity: T): Promise<T>;
  delete(id: string): Promise<void>;
}
