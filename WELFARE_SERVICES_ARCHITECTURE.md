# 복지 서비스 파싱 시스템 아키텍처

## 개요

공공데이터 포털의 한국사회보장정보원 지자체 복지서비스 API를 파싱하여 데이터베이스에 저장하고, OpenAI를 사용하여 각 서비스를 한 줄로 요약하는 시스템입니다.

## 전체 아키텍처

```
┌─────────────────────────────────────────────────────────────┐
│                    Presentation Layer                        │
│                  (Controllers & DTOs)                         │
├─────────────────────────────────────────────────────────────┤
│  GET  /v1/welfare-services                                   │
│  GET  /v1/welfare-services/:id                               │
│  GET  /v1/welfare-services/search/region                     │
│  POST /v1/welfare-services/sync                              │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                  Application Layer                           │
│                    (Use Cases)                               │
├─────────────────────────────────────────────────────────────┤
│  - SyncWelfareServicesUseCase                               │
│  - GetWelfareServiceUseCase                                 │
│  - GetAllWelfareServicesUseCase                             │
│  - SearchWelfareServicesByRegionUseCase                     │
│                                                              │
│  Application Services:                                       │
│  - AISummaryService (OpenAI 통합)                           │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                    Domain Layer                              │
│              (Entities & Value Objects)                      │
├─────────────────────────────────────────────────────────────┤
│  Entities:                                                   │
│  - WelfareService (Aggregate Root)                          │
│                                                              │
│  Value Objects:                                              │
│  - ServiceId                                                 │
│  - Region (ctpvNm, sggNm)                                   │
│                                                              │
│  Repository Interfaces:                                      │
│  - IWelfareServiceRepository                                │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                Infrastructure Layer                          │
│           (Repositories & External Clients)                  │
├─────────────────────────────────────────────────────────────┤
│  Repository Implementations:                                 │
│  - WelfareServiceRepository (TypeORM)                       │
│                                                              │
│  External API Clients:                                       │
│  - LocalWelfareApiClient (공공데이터 포털)                  │
│                                                              │
│  Database: PostgreSQL (TypeORM)                             │
└─────────────────────────────────────────────────────────────┘
```

## 디렉토리 구조

```
src/modules/welfare-services/
├── domain/                                    # 도메인 레이어
│   ├── entities/
│   │   └── WelfareService.entity.ts          # 복지 서비스 엔티티
│   ├── value-objects/
│   │   ├── ServiceId.vo.ts                   # 서비스 ID VO
│   │   └── Region.vo.ts                      # 지역 VO
│   ├── repositories/
│   │   └── WelfareServiceRepository.interface.ts
│   └── exceptions/
│       ├── WelfareServiceErrorCode.enum.ts
│       ├── WelfareServiceNotFoundException.ts
│       └── ApiRequestFailedException.ts
│
├── application/                               # 애플리케이션 레이어
│   ├── dto/                                   # DTO는 Application Layer에 위치
│   │   ├── request/
│   │   │   └── SearchWelfareRequest.dto.ts
│   │   └── response/
│   │       └── WelfareServiceResponse.dto.ts
│   ├── use-cases/
│   │   ├── SyncWelfareServices.use-case.ts
│   │   ├── GetWelfareService.use-case.ts
│   │   ├── GetAllWelfareServices.use-case.ts
│   │   └── SearchWelfareServicesByRegion.use-case.ts
│   └── services/
│       └── AISummaryService.ts               # OpenAI 요약 서비스
│
├── infrastructure/                            # 인프라 레이어
│   ├── repositories/
│   │   └── WelfareServiceRepository.ts       # TypeORM 구현
│   └── clients/
│       └── LocalWelfareApiClient.ts          # 공공데이터 API 클라이언트
│
├── presentation/                              # 프레젠테이션 레이어
│   └── controllers/
│       └── WelfareServicesController.ts
│
└── WelfareServices.module.ts                 # NestJS 모듈
```

**파일명 컨벤션**: PascalCase 사용 (기존 Calls 모듈 패턴 준수)
- Entity: `WelfareService.entity.ts`
- Value Object: `ServiceId.vo.ts`, `Region.vo.ts`
- Use Case: `SyncWelfareServices.use-case.ts`
- DTO: `WelfareServiceResponse.dto.ts`
- Controller: `WelfareServicesController.ts`
- Service: `AISummaryService.ts`

## 주요 기능

### 1. 복지 서비스 동기화 (Sync)

**Endpoint**: `POST /v1/welfare-services/sync?generateAiSummary=true`

**기능**:
1. 공공데이터 포털 API에서 전체 복지 서비스 목록 조회
2. 각 서비스의 상세 정보 가져오기
3. 데이터베이스에 저장
4. (옵션) OpenAI를 사용하여 AI 요약 생성

**프로세스**:
```
1. LocalWelfareApiClient.getAllWelfareServices()
   └─> API에서 전체 목록 페이지네이션으로 가져오기

2. For each service:
   ├─> LocalWelfareApiClient.getWelfareDetail(servId)
   │   └─> 상세 정보 가져오기
   │
   ├─> WelfareService.create(data)
   │   └─> 도메인 엔티티 생성
   │
   ├─> (Optional) AISummaryService.summarizeService()
   │   └─> OpenAI로 한 줄 요약 생성
   │
   └─> Repository.save(service)
       └─> PostgreSQL에 저장
```

### 2. 복지 서비스 조회

**Endpoints**:
- `GET /v1/welfare-services` - 전체 목록 (페이지네이션)
- `GET /v1/welfare-services/:id` - 상세 조회
- `GET /v1/welfare-services/search/region?ctpvNm=서울특별시&sggNm=강남구` - 지역별 검색

### 3. AI 요약 생성

**기능**: OpenAI GPT-3.5-turbo를 사용하여 복지 서비스를 한 문장으로 요약

**프롬프트 구조**:
```
시스템: 당신은 복지 서비스 정보를 간단명료하게 요약하는 전문가입니다.

사용자:
복지 서비스: [서비스명]
요약: [서비스 요약]
상세 내용: [상세 내용]

위 복지 서비스를 한 문장(최대 100자)으로 요약해주세요.
누가, 무엇을, 어떻게 받을 수 있는지 명확하게 표현해주세요.
```

**Fallback 전략**:
- OpenAI API 키가 없거나 오류 발생 시 원본 요약 사용
- 요약이 100자를 넘으면 자동으로 잘라냄

## 데이터 모델

### WelfareService Entity

```typescript
{
  id: string;                      // 서비스 ID (Primary Key)
  serviceName: string;             // 서비스 이름
  serviceSummary: string;          // 원본 요약
  aiSummary: string | null;        // AI 생성 요약

  // 지역 정보
  ctpvNm: string;                  // 시도명
  sggNm: string;                   // 시군구명

  // 서비스 정보
  bizChrDeptNm: string;            // 담당 부서
  supportType: string;             // 지원 유형
  supportCycle: string;            // 지원 주기
  applicationMethod: string;       // 신청 방법

  // 대상자 정보
  lifeCycleArray: string;          // 생애주기
  targetArray: string;             // 대상자
  interestThemeArray: string;      // 관심주제

  // 상세 내용
  supportTargetContent: string;    // 지원 대상 내용
  selectionCriteria: string;       // 선정 기준
  serviceContent: string;          // 서비스 내용
  applicationMethodContent: string;// 신청 방법 내용

  // 메타데이터
  inquiryCount: number;            // 조회 수
  detailLink: string;              // 상세 링크
  lastModifiedDate: string;        // 최종 수정일

  createdAt: Date;                 // 생성일
  updatedAt: Date;                 // 수정일
}
```

## API 명세

### 1. 복지 서비스 동기화

```http
POST /v1/welfare-services/sync?generateAiSummary=true
```

**Query Parameters**:
- `generateAiSummary` (optional): AI 요약 생성 여부 (true/false)

**Response**:
```json
{
  "success": true,
  "data": {
    "synced": 1500,
    "created": 1200,
    "updated": 300,
    "aiSummaryGenerated": 1200
  },
  "timestamp": "2025-12-14T..."
}
```

### 2. 복지 서비스 목록 조회

```http
GET /v1/welfare-services?page=1&limit=20
```

**Query Parameters**:
- `page` (optional): 페이지 번호 (기본값: 1)
- `limit` (optional): 페이지당 항목 수 (기본값: 20)

**Response**:
```json
{
  "success": true,
  "data": {
    "services": [
      {
        "id": "WII20130000001",
        "serviceName": "아동수당",
        "serviceSummary": "...",
        "aiSummary": "만 8세 미만 아동에게 월 10만원을 지급하는 복지 서비스",
        "ctpvNm": "서울특별시",
        "sggNm": "강남구",
        ...
      }
    ],
    "total": 1500,
    "page": 1,
    "totalPages": 75
  },
  "timestamp": "2025-12-14T..."
}
```

### 3. 복지 서비스 상세 조회

```http
GET /v1/welfare-services/:id
```

**Response**:
```json
{
  "success": true,
  "data": {
    "service": {
      "id": "WII20130000001",
      "serviceName": "아동수당",
      "aiSummary": "만 8세 미만 아동에게 월 10만원을 지급하는 복지 서비스",
      ...
    }
  },
  "timestamp": "2025-12-14T..."
}
```

### 4. 지역별 복지 서비스 검색

```http
GET /v1/welfare-services/search/region?ctpvNm=서울특별시&sggNm=강남구
```

**Query Parameters**:
- `ctpvNm` (required): 시도명
- `sggNm` (optional): 시군구명

**Response**:
```json
{
  "success": true,
  "data": {
    "services": [...]
  },
  "timestamp": "2025-12-14T..."
}
```

## 환경 변수 설정

`.env` 파일에 다음 변수들을 설정하세요:

```bash
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=mobok
DB_USER=postgres
DB_PASSWORD=postgres

# Public Data Portal API
LOCAL_WELFARE_BASE_URL=https://apis.data.go.kr/B554287/LocalGovernmentWelfareInformations
LOCAL_WELFARE_SERVICE_KEY=your_service_key_here

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here
```

## 설치 및 실행

### 1. 패키지 설치

```bash
npm install
```

### 2. PostgreSQL 설정

```bash
# Docker를 사용하는 경우
docker run --name postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres

# 데이터베이스 생성
docker exec -it postgres psql -U postgres -c "CREATE DATABASE mobok;"
```

### 3. 환경 변수 설정

```bash
cp .env.example .env
# .env 파일을 열어서 API 키 설정
```

### 4. 애플리케이션 실행

```bash
# 개발 모드
npm run start:dev

# 프로덕션 모드
npm run build
npm run start:prod
```

### 5. 복지 서비스 동기화

```bash
# API 호출
curl -X POST "http://localhost:3000/v1/welfare-services/sync?generateAiSummary=true"
```

## 주요 기술 스택

- **NestJS**: Node.js 프레임워크
- **TypeORM**: ORM (PostgreSQL)
- **PostgreSQL**: 데이터베이스
- **OpenAI**: AI 요약 생성 (기존 AIConversationService 패턴 준수)
- **@nestjs/axios**: HTTP 클라이언트
- **xml2js**: XML 파싱

## 기존 아키텍처와의 통합

이 모듈은 기존 `calls` 모듈의 아키텍처 패턴을 준수합니다:

1. **OpenAI 서비스 패턴**: `AIConversationService`와 동일한 패턴 사용
   - ConfigService로 API 키 관리
   - model 설정 (.env의 OPENAI_MODEL 사용)
   - 일관된 로깅 패턴
   - Fallback 전략

2. **파일명 컨벤션**: PascalCase (Calls 모듈 기준)
   - ✅ `WelfareServicesController.ts`
   - ✅ `SyncWelfareServices.use-case.ts`
   - ✅ `WelfareServiceResponse.dto.ts`

3. **DTO 위치**: Application Layer (기존 Calls 모듈과 동일)
   - `application/dto/request/`
   - `application/dto/response/`

4. **Response 표준화**: TransformInterceptor 사용
   ```json
   {
     "success": true,
     "data": { ... },
     "timestamp": "2025-12-14T..."
   }
   ```

## 설계 원칙

### DDD (Domain-Driven Design)

1. **Domain Layer**: 비즈니스 로직 (엔티티, Value Objects)
2. **Application Layer**: Use Cases, Application Services
3. **Infrastructure Layer**: 데이터베이스, 외부 API 연동
4. **Presentation Layer**: Controllers, DTOs

### Clean Architecture

- 의존성 방향: Presentation → Application → Domain ← Infrastructure
- Domain은 다른 레이어에 의존하지 않음
- Repository 패턴으로 데이터 접근 추상화

### SOLID Principles

- Single Responsibility: 각 클래스는 하나의 책임만
- Open/Closed: 확장에는 열려있고 수정에는 닫혀있음
- Dependency Inversion: 추상화에 의존

## 성능 최적화

### 1. 배치 처리

- 복지 서비스 동기화 시 배치로 처리
- 각 요청 사이에 100ms 대기 (Rate Limiting)

### 2. AI 요약 생성

- 각 AI 요청 사이에 500ms 대기
- Fallback 전략으로 안정성 확보

### 3. 데이터베이스 인덱싱

```sql
-- 자동 생성되는 인덱스
CREATE INDEX idx_welfare_service_region ON welfare_services(ctpv_nm, sgg_nm);
CREATE INDEX idx_welfare_service_created_at ON welfare_services(created_at);
```

## 에러 처리

### 커스텀 예외

- `WelfareServiceNotFoundException`: 서비스를 찾을 수 없음 (404)
- `ApiRequestFailedException`: 외부 API 요청 실패 (502)

### 글로벌 예외 필터

- `HttpExceptionFilter`로 모든 예외 처리
- 표준화된 에러 응답 포맷

## 향후 개선 사항

1. **캐싱**: Redis를 사용한 조회 성능 개선
2. **검색 기능**: Elasticsearch 통합으로 전문 검색
3. **스케줄링**: Cron job으로 자동 동기화
4. **모니터링**: 동기화 상태 대시보드
5. **알림**: 동기화 완료 시 Slack/Email 알림

## 라이선스

UNLICENSED
