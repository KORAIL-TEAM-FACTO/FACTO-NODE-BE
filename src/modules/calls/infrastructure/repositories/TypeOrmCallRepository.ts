import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { ICallRepository } from '../../domain/repositories/CallRepository.interface';
import { Call } from '../../domain/entities/Call.entity';
import { CallStatusEnum } from '../../domain/value-objects/CallStatus.vo';
import { CallEntity } from '../persistence/CallEntity';
import { CallMapper } from '../persistence/CallMapper';

/**
 * Call Repository Implementation (TypeORM)
 *
 * @description TypeORM 기반 통화 리포지토리 구현
 */
@Injectable()
export class TypeOrmCallRepository implements ICallRepository {
  constructor(
    @InjectRepository(CallEntity)
    private readonly repository: Repository<CallEntity>,
  ) {}

  async findById(id: string): Promise<Call | null> {
    const entity = await this.repository.findOne({ where: { id } });
    return entity ? CallMapper.toDomain(entity) : null;
  }

  async findAll(): Promise<Call[]> {
    const entities = await this.repository.find();
    return entities.map(CallMapper.toDomain);
  }

  async save(call: Call): Promise<Call> {
    const entity = CallMapper.toPersistence(call);
    const saved = await this.repository.save(entity);
    return CallMapper.toDomain(saved);
  }

  async update(call: Call): Promise<Call> {
    const entity = CallMapper.toPersistence(call);
    const updated = await this.repository.save(entity);
    return CallMapper.toDomain(updated);
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  async findBySessionId(sessionId: string): Promise<Call | null> {
    const entity = await this.repository.findOne({ where: { sessionId } });
    return entity ? CallMapper.toDomain(entity) : null;
  }

  async findActiveCallsByCallerNumber(callerNumber: string): Promise<Call[]> {
    const entities = await this.repository.find({
      where: [
        { callerNumber, status: CallStatusEnum.INITIATING },
        { callerNumber, status: CallStatusEnum.RINGING },
        { callerNumber, status: CallStatusEnum.CONNECTING },
        { callerNumber, status: CallStatusEnum.IN_PROGRESS },
      ],
    });
    return entities.map(CallMapper.toDomain);
  }

  async findByStatus(status: CallStatusEnum): Promise<Call[]> {
    const entities = await this.repository.find({ where: { status } });
    return entities.map(CallMapper.toDomain);
  }
}
