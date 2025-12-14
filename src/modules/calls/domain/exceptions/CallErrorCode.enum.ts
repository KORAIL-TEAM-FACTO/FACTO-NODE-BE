/**
 * Call Error Codes
 *
 * @description
 * - 형식: HE_DDCCII
 * - DD: Domain (02=Call)
 * - CC: Category (01=Not Found, 02=Validation, 03=State, 04=Connection)
 * - II: Increment
 */
export enum CallErrorCode {
  // Not Found (01)
  CALL_NOT_FOUND = 'HE_020101',
  SESSION_NOT_FOUND = 'HE_020102',

  // Validation (02)
  INVALID_PHONE_NUMBER = 'HE_020201',
  INVALID_SESSION_ID = 'HE_020202',

  // State Errors (03)
  CALL_ALREADY_ACTIVE = 'HE_020301',
  CALL_ALREADY_ENDED = 'HE_020302',
  INVALID_STATE_TRANSITION = 'HE_020303',

  // Connection Errors (04)
  WEBRTC_CONNECTION_FAILED = 'HE_020401',
  SIGNALING_FAILED = 'HE_020402',
  AI_SERVICE_UNAVAILABLE = 'HE_020403',
}
