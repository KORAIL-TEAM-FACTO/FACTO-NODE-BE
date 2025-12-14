# 🚨 긴급 수정 필요 사항

## 문제 상황
복지 서비스 동기화가 실패하고 있습니다. 원인은 **API 응답 형식이 혼재**되어 있기 때문입니다.

### 현재 상황
1. **목록 조회 API** (`/LcgvWelfarelist`): **JSON으로 응답** ✅ (이미 수정 완료)
2. **상세 조회 API** (`/LcgvWelfaredetailed`): **XML로 응답** ❌ (수정 필요!)

### 실제 로그 확인
```
Detail API Response for WLF00004437: "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><wantedDtl><resultCode>0</resultCode><resultMessage>SUCCESS</resultMessage>..."
```

상세 API는 XML로 응답하는데, 코드에서는 JSON으로 파싱하려고 해서 실패합니다.

---

## 📝 수정해야 할 파일

### 파일 위치
```
src/modules/welfare-services/infrastructure/clients/LocalWelfareApiClient.ts
```

### 수정할 메서드
`getWelfareDetail(servId: string)` 메서드 (대략 145번째 줄)

---

## 🔧 수정 방법

### 현재 코드 (잘못된 부분)
```typescript
// 151번째 줄 근처
const response = await firstValueFrom(
  this.httpService.get(`${this.baseUrl}/LcgvWelfaredetailed`, { params }),
);

// API가 JSON으로 응답함 ❌ 틀렸음! 실제로는 XML로 옴
const data = response.data;

// Check for errors
if (data.resultCode !== '0') {  // ❌ data가 XML 문자열이라 undefined
  const errorMsg = data.resultMessage || 'Unknown error';
  throw new ApiRequestFailedException(`API Error: ${errorMsg}`);
}
```

### 수정해야 할 코드
```typescript
// 1. xml2js import가 이미 파일 상단에 있음 (5번째 줄)
import { parseString } from 'xml2js';
const parseXml = promisify(parseString);

// 2. getWelfareDetail 메서드를 다음과 같이 수정:

const response = await firstValueFrom(
  this.httpService.get(`${this.baseUrl}/LcgvWelfaredetailed`, { params }),
);

// XML 파싱
const parsed: any = await parseXml(response.data);

// XML 구조: <wantedDtl><resultCode>0</resultCode>...</wantedDtl>
const detail = parsed.wantedDtl;

// Check for errors
if (detail.resultCode?.[0] !== '0') {
  const errorMsg = detail.resultMessage?.[0] || 'Unknown error';
  throw new ApiRequestFailedException(`API Error: ${errorMsg}`);
}

// 데이터 반환 (XML은 배열로 파싱됨)
return {
  servId: detail.servId?.[0] || servId,
  servNm: detail.servNm?.[0] || '',
  servDgst: detail.servDgst?.[0],
  ctpvNm: detail.ctpvNm?.[0],
  sggNm: detail.sggNm?.[0],
  bizChrDeptNm: detail.bizChrDeptNm?.[0],
  srvPvsnNm: detail.srvPvsnNm?.[0],
  sprtCycNm: detail.sprtCycNm?.[0],
  aplyMtdNm: detail.aplyMtdNm?.[0],
  lifeNmArray: detail.lifeNmArray?.[0],
  trgterIndvdlNmArray: detail.trgterIndvdlNmArray?.[0],
  intrsThemaNmArray: detail.intrsThemaNmArray?.[0],
  sprtTrgtCn: detail.sprtTrgtCn?.[0],
  slctCritCn: detail.slctCritCn?.[0],
  alwServCn: detail.alwServCn?.[0],
  aplyMtdCn: detail.aplyMtdCn?.[0],
  inqNum: detail.inqNum?.[0],
  lastModYmd: detail.lastModYmd?.[0],
};
```

---

## ⚠️ 중요한 포인트

### XML 파싱 특징
- **xml2js**는 모든 값을 **배열**로 변환합니다
- 따라서 `detail.servId` 가 아니라 `detail.servId[0]` 으로 접근해야 함
- 루트 태그는 `<wantedDtl>` 입니다

### 에러 체크
```typescript
// XML 파싱 후
if (detail.resultCode?.[0] !== '0') {  // 배열이므로 [0] 필요!
  // 에러 처리
}
```

### 데이터 반환
```typescript
// 모든 필드에 [0] 인덱스 추가
servId: detail.servId?.[0] || servId,
servNm: detail.servNm?.[0] || '',
// ... 나머지도 동일
```

---

## ✅ 수정 후 확인 사항

1. **빌드**: `npm run build` 실행해서 에러 없는지 확인
2. **실행**: `npm run start:dev`로 서버 시작
3. **테스트**: 백오피스 `http://localhost:3000/admin.html` 접속 후 "동기화 시작" 버튼 클릭
4. **로그 확인**:
   - `[DEBUG] Detail API Response for WLF00004437: <?xml...` 나오는지 확인
   - 에러 없이 `Creating new local service: WLF00004437` 같은 로그 나오는지 확인

---

## 🎯 최종 목표

동기화가 정상적으로 작동하여:
- 지자체 복지 서비스 데이터가 DB에 저장됨
- 중앙부처 복지 서비스 데이터가 DB에 저장됨
- AI 요약이 생성됨 (OpenAI 키가 설정된 경우)
- 백오피스에서 목록 조회 시 데이터가 보임

---

## 📌 추가 참고사항

### API 응답 형식 정리
```
목록 API (/LcgvWelfarelist):
- 요청: GET https://apis.data.go.kr/.../LcgvWelfarelist?serviceKey=...&pageNo=1&numOfRows=100
- 응답: JSON { resultCode: "0", resultMessage: "SUCCESS", servList: [...] }

상세 API (/LcgvWelfaredetailed):
- 요청: GET https://apis.data.go.kr/.../LcgvWelfaredetailed?serviceKey=...&servId=WLF00004437
- 응답: XML <?xml version="1.0"?><wantedDtl><resultCode>0</resultCode>...</wantedDtl>
```

### 파일 구조
```
src/modules/welfare-services/
├── infrastructure/
│   └── clients/
│       ├── LocalWelfareApiClient.ts  ← 여기 수정!
│       └── CentralWelfareApiClient.ts
```

---

## 🚀 수정 완료 후 동작 흐름

1. 백오피스에서 "동기화 시작" 클릭
2. 목록 API 호출 (JSON) → 100개씩 가져옴
3. 각 항목마다 상세 API 호출 (XML) → 파싱 → DB 저장
4. AI 요약 생성 (새 항목만)
5. 다음 페이지 처리
6. 완료 후 통계 표시

---

**작성일**: 2025-12-14
**우선순위**: 🔴 긴급 (동기화가 전혀 동작하지 않음)
**예상 소요 시간**: 10분
