import { Controller, Get, Post, Param, Query, UseInterceptors } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { TransformInterceptor } from '../../../../common/interceptors/transform.interceptor';
import { SyncWelfareServicesUseCase } from '../../application/use-cases/SyncWelfareServices.use-case';
import { GetWelfareServiceUseCase } from '../../application/use-cases/GetWelfareService.use-case';
import { GetAllWelfareServicesUseCase } from '../../application/use-cases/GetAllWelfareServices.use-case';
import { SearchWelfareServicesByRegionUseCase } from '../../application/use-cases/SearchWelfareServicesByRegion.use-case';
import { WelfareServiceResponse } from '../../application/dto/response/WelfareServiceResponse.dto';

/**
 * Welfare Services Controller
 *
 * @description
 * - 복지 서비스 관련 HTTP 엔드포인트 관리
 * - 복지 서비스 조회, 검색, 동기화 기능 제공
 */
@ApiTags('welfare-services')
@Controller('welfare-services')
@UseInterceptors(TransformInterceptor)
export class WelfareServicesController {
  constructor(
    private readonly syncWelfareServicesUseCase: SyncWelfareServicesUseCase,
    private readonly getWelfareServiceUseCase: GetWelfareServiceUseCase,
    private readonly getAllWelfareServicesUseCase: GetAllWelfareServicesUseCase,
    private readonly searchWelfareServicesByRegionUseCase: SearchWelfareServicesByRegionUseCase,
  ) {}

  /**
   * 복지 서비스 동기화 (관리자용)
   *
   * @param generateAiSummary - AI 요약 생성 여부
   * @returns 동기화 결과
   */
  @Post('sync')
  @ApiOperation({ summary: '복지 서비스 동기화', description: '공공데이터 포털에서 복지 서비스 데이터를 동기화합니다' })
  @ApiQuery({
    name: 'generateAiSummary',
    required: false,
    type: Boolean,
    description: 'AI 요약 생성 여부',
    example: true,
  })
  @ApiResponse({
    status: 201,
    description: '동기화 성공',
  })
  async syncServices(
    @Query('generateAiSummary') generateAiSummary?: string,
  ): Promise<{
    synced: number;
    created: number;
    updated: number;
    aiSummaryGenerated: number;
  }> {
    const shouldGenerateAiSummary = generateAiSummary === 'true';
    return this.syncWelfareServicesUseCase.execute(shouldGenerateAiSummary);
  }

  /**
   * 복지 서비스 목록 조회
   *
   * @param page - 페이지 번호
   * @param limit - 페이지당 항목 수
   * @returns 복지 서비스 목록
   */
  @Get()
  @ApiOperation({ summary: '복지 서비스 목록 조회' })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: '페이지 번호',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: '페이지당 항목 수',
    example: 20,
  })
  @ApiResponse({
    status: 200,
    description: '복지 서비스 목록 조회 성공',
    type: [WelfareServiceResponse],
  })
  async getAllServices(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<{
    services: WelfareServiceResponse[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const pageNum = parseInt(page || '1', 10);
    const limitNum = parseInt(limit || '20', 10);

    const result = await this.getAllWelfareServicesUseCase.execute(pageNum, limitNum);

    return {
      services: result.data.map(WelfareServiceResponse.fromEntity),
      total: result.total,
      page: result.page,
      totalPages: result.totalPages,
    };
  }

  /**
   * 복지 서비스 상세 조회
   *
   * @param id - 서비스 ID
   * @returns 복지 서비스 상세 정보
   */
  @Get(':id')
  @ApiOperation({ summary: '복지 서비스 상세 조회' })
  @ApiParam({
    name: 'id',
    description: '서비스 ID',
    example: 'WII20130000001',
  })
  @ApiResponse({
    status: 200,
    description: '복지 서비스 조회 성공',
    type: WelfareServiceResponse,
  })
  @ApiResponse({
    status: 404,
    description: '복지 서비스를 찾을 수 없음',
  })
  async getService(@Param('id') id: string): Promise<{ service: WelfareServiceResponse }> {
    const service = await this.getWelfareServiceUseCase.execute(id);
    return { service: WelfareServiceResponse.fromEntity(service) };
  }

  /**
   * 지역별 복지 서비스 검색
   *
   * @param ctpvNm - 시도명
   * @param sggNm - 시군구명 (선택)
   * @returns 복지 서비스 목록
   */
  @Get('search/region')
  @ApiOperation({ summary: '지역별 복지 서비스 검색' })
  @ApiQuery({
    name: 'ctpvNm',
    required: true,
    type: String,
    description: '시도명',
    example: '서울특별시',
  })
  @ApiQuery({
    name: 'sggNm',
    required: false,
    type: String,
    description: '시군구명',
    example: '강남구',
  })
  @ApiResponse({
    status: 200,
    description: '검색 성공',
    type: [WelfareServiceResponse],
  })
  async searchByRegion(
    @Query('ctpvNm') ctpvNm: string,
    @Query('sggNm') sggNm?: string,
  ): Promise<{ services: WelfareServiceResponse[] }> {
    const services = await this.searchWelfareServicesByRegionUseCase.execute(ctpvNm, sggNm);
    return {
      services: services.map(WelfareServiceResponse.fromEntity),
    };
  }
}
