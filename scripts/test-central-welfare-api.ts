import axios from 'axios';
import * as dotenv from 'dotenv';

// .env 파일 로드
dotenv.config();

/**
 * 중앙부처 복지서비스 API 테스트 스크립트
 *
 * Usage:
 *   npm run script:test-central-welfare [page]
 *
 * Examples:
 *   npm run script:test-central-welfare
 *   npm run script:test-central-welfare 2
 */

interface CentralWelfareResponse {
  page: number;
  perPage: number;
  totalCount: number;
  currentCount: number;
  matchCount: number;
  data: CentralWelfareItem[];
}

interface CentralWelfareItem {
  서비스아이디: string;
  서비스명: string;
  서비스URL: string;
  서비스요약: string;
  사이트: string;
  대표문의: string;
  소관부처명: string;
  소관조직명: string;
  기준연도: number;
  최종수정일: string;
}

async function testCentralWelfareApi() {
  // 환경변수에서 설정 로드
  const baseUrl = process.env.CENTRAL_WELFARE_BASE_URL || 'https://api.odcloud.kr/api';
  const serviceKey = process.env.CENTRAL_WELFARE_SERVICE_KEY || '';
  const resourceId = process.env.CENTRAL_WELFARE_RESOURCE_ID || 'uddi:3929b807-3420-44d7-a851-cc741fce65a1';

  // CLI 인자에서 페이지 번호 가져오기 (기본값: 1)
  const page = parseInt(process.argv[2] || '1', 10);
  const perPage = 100;

  // URL 구성
  const url = `${baseUrl}/15083323/v1/${resourceId}`;
  const params = {
    page: String(page),
    perPage: String(perPage),
    serviceKey: serviceKey,
  };

  console.log('='.repeat(80));
  console.log('중앙부처 복지서비스 API 테스트');
  console.log('='.repeat(80));
  console.log();
  console.log('📡 요청 정보:');
  console.log(`  URL: ${url}`);
  console.log(`  Page: ${page}`);
  console.log(`  PerPage: ${perPage}`);
  console.log(`  ServiceKey: ${serviceKey ? serviceKey.substring(0, 20) + '...' : '(없음)'}`);
  console.log();

  try {
    console.log('🚀 API 요청 중...');
    console.log();

    const startTime = Date.now();
    const response = await axios.get<CentralWelfareResponse>(url, { params });
    const endTime = Date.now();

    console.log('✅ 응답 성공!');
    console.log(`⏱️  응답 시간: ${endTime - startTime}ms`);
    console.log();

    // 응답 메타데이터
    console.log('📊 응답 메타데이터:');
    console.log(`  Page: ${response.data.page}`);
    console.log(`  PerPage: ${response.data.perPage}`);
    console.log(`  TotalCount: ${response.data.totalCount}`);
    console.log(`  CurrentCount: ${response.data.currentCount}`);
    console.log(`  MatchCount: ${response.data.matchCount}`);
    console.log();

    // 데이터 항목 수
    const items = response.data.data;
    console.log(`📦 데이터 항목 수: ${items.length}`);
    console.log();

    // 첫 3개 항목 출력
    if (items.length > 0) {
      console.log('📝 첫 3개 항목 샘플:');
      console.log('-'.repeat(80));

      items.slice(0, 3).forEach((item, index) => {
        console.log(`\n[${index + 1}] ${item.서비스명}`);
        console.log(`  서비스아이디: ${item.서비스아이디}`);
        console.log(`  소관부처: ${item.소관부처명} - ${item.소관조직명}`);
        console.log(`  사이트: ${item.사이트}`);
        console.log(`  대표문의: ${item.대표문의}`);
        console.log(`  기준연도: ${item.기준연도}`);
        console.log(`  최종수정일: ${item.최종수정일}`);
        console.log(`  서비스요약: ${item.서비스요약.substring(0, 100)}...`);
      });
      console.log();
      console.log('-'.repeat(80));
    }

    // 전체 응답 JSON 출력 (옵션)
    if (process.argv.includes('--full')) {
      console.log();
      console.log('🔍 전체 응답 JSON:');
      console.log(JSON.stringify(response.data, null, 2));
    }

    console.log();
    console.log('='.repeat(80));
    console.log('✅ 테스트 완료!');
    console.log('='.repeat(80));

  } catch (error: any) {
    console.error('❌ API 요청 실패!');
    console.error();

    if (error.response) {
      console.error(`HTTP Status: ${error.response.status}`);
      console.error(`Status Text: ${error.response.statusText}`);
      console.error();
      console.error('응답 데이터:');
      console.error(JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.error('요청이 전송되었으나 응답을 받지 못했습니다.');
      console.error(error.message);
    } else {
      console.error('요청 설정 중 오류 발생:');
      console.error(error.message);
    }

    process.exit(1);
  }
}

// 스크립트 실행
testCentralWelfareApi();
