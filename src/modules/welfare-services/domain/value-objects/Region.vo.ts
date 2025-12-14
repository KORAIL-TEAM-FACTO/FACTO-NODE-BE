import { ValueObject } from '../../../../shared/domain/value-object';

interface RegionProps {
  ctpvNm: string; // 시도명
  sggNm?: string; // 시군구명
}

/**
 * Region Value Object
 *
 * @description 지역 정보를 나타내는 Value Object
 */
export class Region extends ValueObject<RegionProps> {
  private constructor(props: RegionProps) {
    super(props);
  }

  get ctpvNm(): string {
    return this.props.ctpvNm;
  }

  get sggNm(): string | undefined {
    return this.props.sggNm;
  }

  get fullName(): string {
    return this.props.sggNm
      ? `${this.props.ctpvNm} ${this.props.sggNm}`
      : this.props.ctpvNm;
  }

  /**
   * 지역 생성
   *
   * @param ctpvNm - 시도명
   * @param sggNm - 시군구명 (선택)
   * @returns Region Value Object
   */
  static create(ctpvNm: string, sggNm?: string): Region {
    if (!ctpvNm || ctpvNm.trim().length === 0) {
      throw new Error('시도명은 필수입니다');
    }

    return new Region({
      ctpvNm: ctpvNm.trim(),
      sggNm: sggNm?.trim(),
    });
  }
}
