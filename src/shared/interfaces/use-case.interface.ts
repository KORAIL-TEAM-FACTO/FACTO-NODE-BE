/**
 * Use Case Interface - 모든 유스케이스의 기본 인터페이스
 */
export interface IUseCase<IRequest, IResponse> {
  execute(request: IRequest): Promise<IResponse>;
}
