import { AggregateRoot } from '../../../../shared/domain/aggregate-root';

/**
 * ChatSession Entity
 *
 * @description
 * - 채팅 세션 도메인 엔티티
 * - 사용자와 AI 간의 채팅 세션 관리
 */
export class ChatSession extends AggregateRoot {
  private _userId: string;
  private _sessionId: string;
  private _isActive: boolean;
  private _lastActivity: Date;

  private constructor(
    id: string,
    userId: string,
    sessionId: string,
    isActive: boolean,
    lastActivity: Date,
    createdAt?: Date,
    updatedAt?: Date,
  ) {
    super(id, createdAt, updatedAt);
    this._userId = userId;
    this._sessionId = sessionId;
    this._isActive = isActive;
    this._lastActivity = lastActivity;
  }

  // Getters
  get userId(): string {
    return this._userId;
  }

  get sessionId(): string {
    return this._sessionId;
  }

  get isActive(): boolean {
    return this._isActive;
  }

  get lastActivity(): Date {
    return this._lastActivity;
  }

  /**
   * Factory method for creating new chat session
   */
  static create(userId: string, sessionId: string): ChatSession {
    return new ChatSession(
      crypto.randomUUID(),
      userId,
      sessionId,
      true,
      new Date(),
      new Date(),
      new Date(),
    );
  }

  /**
   * Factory method for reconstitution from DB
   */
  static reconstitute(
    id: string,
    userId: string,
    sessionId: string,
    isActive: boolean,
    lastActivity: Date,
    createdAt: Date,
    updatedAt: Date,
  ): ChatSession {
    return new ChatSession(
      id,
      userId,
      sessionId,
      isActive,
      lastActivity,
      createdAt,
      updatedAt,
    );
  }

  /**
   * Update last activity
   */
  updateActivity(): void {
    this._lastActivity = new Date();
    this.touch();
  }

  /**
   * End session
   */
  end(): void {
    this._isActive = false;
    this.touch();
  }

  /**
   * Reactivate session
   */
  reactivate(): void {
    this._isActive = true;
    this.updateActivity();
  }
}
