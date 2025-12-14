/**
 * Welfare Service Error Codes
 *
 * @description
 * - 형식: HE_DDCCII
 * - DD: Domain (03=WelfareService)
 * - CC: Category (01=Not Found, 02=Validation, 03=External API)
 * - II: Increment
 */
export enum WelfareServiceErrorCode {
  WELFARE_SERVICE_NOT_FOUND = 'HE_030101',
  INVALID_SERVICE_ID = 'HE_030201',
  INVALID_REGION = 'HE_030202',
  API_REQUEST_FAILED = 'HE_030301',
  API_PARSE_FAILED = 'HE_030302',
  AI_SUMMARY_FAILED = 'HE_030303',
}
