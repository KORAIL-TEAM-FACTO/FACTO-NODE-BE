import { AggregateRoot } from '../../../../shared/domain/aggregate-root';
import { CallStatus, CallStatusEnum } from '../value-objects/CallStatus.vo';
import { PhoneNumber } from '../value-objects/PhoneNumber.vo';
import { InvalidValueException } from '../../../../common/exceptions/domain.exception';

/**
 * Call Entity - Aggregate Root
 *
 * @description
 * - 통화 도메인의 루트 엔티티
 * - WebRTC 기반 통화 세션 관리
 * - ChatGPT AI와의 자연스러운 대화 지원
 *
 * @example
 * const call = Call.create('+821012345678', '550e8400-e29b-41d4-a716-446655440000');
 * call.startRinging();
 * call.connect();
 */
export class Call extends AggregateRoot {
  private _callerNumber: PhoneNumber;
  private _receiverNumber: PhoneNumber | null;
  private _status: CallStatus;
  private _sessionId: string;
  private _startedAt: Date | null;
  private _endedAt: Date | null;
  private _duration: number; // in seconds
  private _transcript: string[]; // Conversation history
  private _aiContext: Record<string, unknown>; // AI conversation context
  private _webrtcSessionData: Record<string, unknown>; // WebRTC session metadata

  private constructor(
    id: string,
    callerNumber: PhoneNumber,
    receiverNumber: PhoneNumber | null,
    status: CallStatus,
    sessionId: string,
    createdAt: Date,
    updatedAt: Date,
    startedAt: Date | null = null,
    endedAt: Date | null = null,
    duration: number = 0,
    transcript: string[] = [],
    aiContext: Record<string, unknown> = {},
    webrtcSessionData: Record<string, unknown> = {},
  ) {
    super(id, createdAt, updatedAt);
    this._callerNumber = callerNumber;
    this._receiverNumber = receiverNumber;
    this._status = status;
    this._sessionId = sessionId;
    this._startedAt = startedAt;
    this._endedAt = endedAt;
    this._duration = duration;
    this._transcript = transcript;
    this._aiContext = aiContext;
    this._webrtcSessionData = webrtcSessionData;
  }

  // Getters
  get callerNumber(): PhoneNumber {
    return this._callerNumber;
  }

  get receiverNumber(): PhoneNumber | null {
    return this._receiverNumber;
  }

  get status(): CallStatus {
    return this._status;
  }

  get sessionId(): string {
    return this._sessionId;
  }

  get startedAt(): Date | null {
    return this._startedAt;
  }

  get endedAt(): Date | null {
    return this._endedAt;
  }

  get duration(): number {
    return this._duration;
  }

  get transcript(): string[] {
    return [...this._transcript];
  }

  get aiContext(): Record<string, unknown> {
    return { ...this._aiContext };
  }

  get webrtcSessionData(): Record<string, unknown> {
    return { ...this._webrtcSessionData };
  }

  /**
   * Factory method for creating new call
   *
   * @param callerNumber - 발신자 전화번호
   * @param sessionId - WebRTC 세션 ID
   * @param receiverNumber - 수신자 전화번호 (선택)
   * @returns 새로 생성된 Call 엔티티
   */
  static create(
    callerNumber: string,
    sessionId: string,
    receiverNumber?: string,
  ): Call {
    const id = crypto.randomUUID();
    const now = new Date();

    const callerPhoneNumber = PhoneNumber.create(callerNumber);
    const receiverPhoneNumber = receiverNumber
      ? PhoneNumber.create(receiverNumber)
      : null;
    const status = CallStatus.initiating();

    return new Call(
      id,
      callerPhoneNumber,
      receiverPhoneNumber,
      status,
      sessionId,
      now,
      now,
    );
  }

  /**
   * Factory method for reconstitution from DB
   */
  static reconstitute(
    id: string,
    callerNumber: string,
    receiverNumber: string | null,
    status: CallStatusEnum,
    sessionId: string,
    createdAt: Date,
    updatedAt: Date,
    startedAt: Date | null,
    endedAt: Date | null,
    duration: number,
    transcript: string[],
    aiContext: Record<string, unknown>,
    webrtcSessionData: Record<string, unknown>,
  ): Call {
    const callerPhoneNumber = PhoneNumber.create(callerNumber);
    const receiverPhoneNumber = receiverNumber
      ? PhoneNumber.create(receiverNumber)
      : null;
    const callStatus = CallStatus.create(status);

    return new Call(
      id,
      callerPhoneNumber,
      receiverPhoneNumber,
      callStatus,
      sessionId,
      createdAt,
      updatedAt,
      startedAt,
      endedAt,
      duration,
      transcript,
      aiContext,
      webrtcSessionData,
    );
  }

  /**
   * Start ringing phase
   */
  startRinging(): void {
    this.transitionStatus(CallStatusEnum.RINGING);
  }

  /**
   * Start connecting phase
   */
  startConnecting(): void {
    this.transitionStatus(CallStatusEnum.CONNECTING);
  }

  /**
   * Connect the call (start conversation)
   */
  connect(): void {
    this.transitionStatus(CallStatusEnum.IN_PROGRESS);
    this._startedAt = new Date();
    this.touch();
  }

  /**
   * End the call
   */
  end(): void {
    this.transitionStatus(CallStatusEnum.ENDED);
    this._endedAt = new Date();

    if (this._startedAt) {
      this._duration = Math.floor(
        (this._endedAt.getTime() - this._startedAt.getTime()) / 1000,
      );
    }

    this.touch();
  }

  /**
   * Mark call as failed
   *
   * @param reason - Failure reason
   */
  fail(reason?: string): void {
    this.transitionStatus(CallStatusEnum.FAILED);
    this._endedAt = new Date();

    if (reason) {
      this._aiContext['failureReason'] = reason;
    }

    this.touch();
  }

  /**
   * Add message to transcript
   *
   * @param speaker - 'user' or 'ai'
   * @param message - Message content
   */
  addToTranscript(speaker: 'user' | 'ai', message: string): void {
    const timestamp = new Date().toISOString();
    this._transcript.push(`[${timestamp}] ${speaker}: ${message}`);
    this.touch();
  }

  /**
   * Update AI context
   */
  updateAIContext(context: Record<string, unknown>): void {
    this._aiContext = { ...this._aiContext, ...context };
    this.touch();
  }

  /**
   * Update WebRTC session data
   */
  updateWebRTCSessionData(data: Record<string, unknown>): void {
    this._webrtcSessionData = { ...this._webrtcSessionData, ...data };
    this.touch();
  }

  /**
   * Check if call is active
   */
  isActive(): boolean {
    return this._status.isActive();
  }

  /**
   * Transition to new status
   */
  private transitionStatus(newStatus: CallStatusEnum): void {
    if (!this._status.canTransitionTo(newStatus)) {
      throw new InvalidValueException(
        'status transition',
        `Cannot transition from ${this._status.value} to ${newStatus}`,
      );
    }

    this._status = CallStatus.create(newStatus);
    this.touch();
  }
}
