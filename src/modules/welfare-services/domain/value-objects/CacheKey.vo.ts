import { ValueObject } from '../../../../shared/domain/value-object';
import { InvalidValueException } from '../../../../common/exceptions/domain.exception';

interface CacheKeyProps {
  value: string;
}

/**
 * Cache Key Value Object
 *
 * @description
 * - API 캐시 키를 표현하는 값 객체
 * - URL과 파라미터를 조합하여 고유 키 생성
 */
export class CacheKey extends ValueObject<CacheKeyProps> {
  private constructor(props: CacheKeyProps) {
    super(props);
  }

  get value(): string {
    return this.props.value;
  }

  /**
   * CacheKey 생성
   *
   * @param key - 캐시 키 문자열
   * @returns CacheKey 인스턴스
   * @throws {InvalidValueException} 키가 비어있을 때
   */
  static create(key: string): CacheKey {
    if (!key || key.trim().length === 0) {
      throw new InvalidValueException('cacheKey', key);
    }

    return new CacheKey({ value: key.trim() });
  }

  /**
   * URL과 파라미터로부터 캐시 키 생성
   *
   * @param url - API URL
   * @param params - API 파라미터 객체
   * @returns CacheKey 인스턴스
   */
  static fromUrlAndParams(url: string, params: Record<string, any> = {}): CacheKey {
    const sortedParams = Object.keys(params)
      .sort()
      .map((key) => `${key}=${params[key]}`)
      .join('&');

    const key = sortedParams ? `${url}?${sortedParams}` : url;
    return CacheKey.create(key);
  }
}
