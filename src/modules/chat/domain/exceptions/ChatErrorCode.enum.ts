/**
 * Chat Error Codes
 *
 * @description
 * - 형식: HE_DDCCII
 * - DD: Domain (05=Chat)
 * - CC: Category (01=Not Found, 02=Validation, etc.)
 * - II: Increment
 */
export enum ChatErrorCode {
  SESSION_NOT_FOUND = 'HE_050101',
  MESSAGE_NOT_FOUND = 'HE_050102',
  SESSION_ALREADY_ACTIVE = 'HE_050201',
  INVALID_MESSAGE_TYPE = 'HE_050202',
  INVALID_SENDER = 'HE_050203',
}
