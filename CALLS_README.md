# WebRTC + ChatGPT AI 통화 시스템

## 개요

이 프로젝트는 **WebRTC**와 **ChatGPT API**를 통합하여 자연스러운 AI 음성 대화가 가능한 프로덕션급 전화 시스템입니다.

## 주요 기능

- ✅ **WebRTC 기반 실시간 음성 통화**
- ✅ **Socket.IO 시그널링 서버**
- ✅ **ChatGPT API 통합** (음성 → 텍스트 → AI 응답 → 음성)
- ✅ **Google STUN 서버 사용** (무료)
- ✅ **대화 히스토리 저장**
- ✅ **감정 분석**
- ✅ **RESTful API + WebSocket**
- ✅ **DDD 아키텍처**

## 시스템 아키텍처

```
┌─────────────┐         WebSocket          ┌─────────────┐
│   Client    │◄─────Signaling────────────►│   Server    │
│  (Browser)  │                             │  (NestJS)   │
└─────────────┘                             └─────────────┘
      │                                            │
      │ WebRTC P2P Connection                     │
      │ (Audio Stream)                            │
      │                                            ▼
      │                                    ┌──────────────┐
      │                                    │  ChatGPT API │
      │                                    │   (OpenAI)   │
      │                                    └──────────────┘
      │                                            │
      │◄───────────AI Voice Response──────────────┘
```

## 설치 및 실행

### 1. 환경 설정

`.env` 파일을 수정하여 OpenAI API 키를 입력하세요:

```bash
# OpenAI Configuration
OPENAI_API_KEY=sk-your-actual-api-key-here
OPENAI_MODEL=gpt-4o

# WebRTC STUN Server (Google 무료 STUN 서버 사용)
STUN_SERVER_URL=stun:stun.l.google.com:19302
```

### 2. 서버 실행

```bash
# 개발 모드
npm run start:dev

# 프로덕션 빌드
npm run build
npm run start:prod
```

서버가 실행되면:
- 🚀 **REST API**: http://localhost:3000/api/v1/calls
- 🔌 **WebSocket Signaling**: ws://localhost:3000/signaling
- 📚 **Swagger 문서**: http://localhost:3000/api/docs

## API 사용법

### 1. WebRTC 설정 가져오기

클라이언트에서 WebRTC 연결을 시작하기 전에 먼저 설정을 가져옵니다.

```bash
GET /api/v1/calls/config
```

**응답:**
```json
{
  "success": true,
  "data": {
    "config": {
      "iceServers": [
        { "urls": "stun:stun.l.google.com:19302" },
        { "urls": "stun:stun1.l.google.com:19302" },
        { "urls": "stun:stun2.l.google.com:19302" }
      ],
      "iceCandidatePoolSize": 10,
      "iceTransportPolicy": "all",
      "bundlePolicy": "max-bundle",
      "rtcpMuxPolicy": "require"
    }
  }
}
```

### 2. 통화 시작

```bash
POST /api/v1/calls
Content-Type: application/json

{
  "callerNumber": "01012345678",
  "receiverNumber": "01087654321"  // 선택사항
}
```

**응답:**
```json
{
  "success": true,
  "data": {
    "call": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "sessionId": "abc123-session-id",
      "callerNumber": "01012345678",
      "status": "RINGING",
      "createdAt": "2024-12-14T10:00:00.000Z"
    }
  }
}
```

### 3. WebSocket으로 시그널링 연결

```javascript
const socket = io('http://localhost:3000/signaling');

// 세션 참여
socket.emit('join-session', {
  sessionId: 'abc123-session-id',
  peerId: 'my-peer-id'
});

// Offer 전송
socket.emit('offer', {
  sessionId: 'abc123-session-id',
  peerId: 'my-peer-id',
  offer: rtcPeerConnection.localDescription
});

// Answer 수신
socket.on('answer', ({ peerId, answer }) => {
  rtcPeerConnection.setRemoteDescription(answer);
});

// ICE Candidate 교환
socket.emit('ice-candidate', {
  sessionId: 'abc123-session-id',
  peerId: 'my-peer-id',
  candidate: event.candidate
});
```

### 4. 통화 연결

```bash
POST /api/v1/calls/{callId}/connect
```

### 5. AI 대화 처리

사용자 음성을 AI가 처리하고 응답합니다.

```bash
POST /api/v1/calls/conversation/process
Content-Type: multipart/form-data

{
  "audio": [audio file],
  "callId": "550e8400-e29b-41d4-a716-446655440000",
  "systemPrompt": "당신은 친절한 고객 서비스 담당자입니다."
}
```

**응답:**
```json
{
  "success": true,
  "data": {
    "conversation": {
      "userMessage": "안녕하세요, 문의사항이 있습니다",
      "aiResponse": "안녕하세요! 무엇을 도와드릴까요?",
      "sentiment": {
        "sentiment": "neutral",
        "score": 0.5
      },
      "timestamp": "2024-12-14T10:01:00.000Z"
    },
    "audioUrl": "data:audio/mp3;base64,..."
  }
}
```

### 6. 통화 종료

```bash
POST /api/v1/calls/{callId}/end
```

### 7. 통화 정보 조회

```bash
GET /api/v1/calls/{callId}
```

## 클라이언트 예제 코드

### HTML + JavaScript 예제

```html
<!DOCTYPE html>
<html>
<head>
  <title>WebRTC AI Call</title>
</head>
<body>
  <button id="startCall">통화 시작</button>
  <button id="endCall">통화 종료</button>
  <audio id="remoteAudio" autoplay></audio>

  <script src="https://cdn.socket.io/4.5.4/socket.io.min.js"></script>
  <script>
    let peerConnection;
    let localStream;
    let socket;
    let callId;
    let sessionId;

    const startCallBtn = document.getElementById('startCall');
    const endCallBtn = document.getElementById('endCall');

    startCallBtn.onclick = async () => {
      // 1. WebRTC 설정 가져오기
      const configRes = await fetch('http://localhost:3000/api/v1/calls/config');
      const configData = await configRes.json();
      const rtcConfig = configData.data.config;

      // 2. 통화 시작
      const callRes = await fetch('http://localhost:3000/api/v1/calls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callerNumber: '01012345678'
        })
      });
      const callData = await callRes.json();
      callId = callData.data.call.id;
      sessionId = callData.data.call.sessionId;

      // 3. WebSocket 연결
      socket = io('http://localhost:3000/signaling');

      // 4. 로컬 오디오 스트림 가져오기
      localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false
      });

      // 5. RTCPeerConnection 생성
      peerConnection = new RTCPeerConnection(rtcConfig);

      // 6. 로컬 스트림 추가
      localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
      });

      // 7. 원격 스트림 수신
      peerConnection.ontrack = (event) => {
        document.getElementById('remoteAudio').srcObject = event.streams[0];
      };

      // 8. ICE Candidate 처리
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('ice-candidate', {
            sessionId,
            peerId: 'client-peer',
            candidate: event.candidate
          });
        }
      };

      // 9. 세션 참여
      socket.emit('join-session', {
        sessionId,
        peerId: 'client-peer'
      });

      // 10. Offer 생성 및 전송
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      socket.emit('offer', {
        sessionId,
        peerId: 'client-peer',
        offer
      });

      // 11. Answer 수신
      socket.on('answer', async ({ answer }) => {
        await peerConnection.setRemoteDescription(answer);
      });

      // 12. ICE Candidate 수신
      socket.on('ice-candidate', async ({ candidate }) => {
        await peerConnection.addIceCandidate(candidate);
      });

      // 13. 통화 연결
      await fetch(`http://localhost:3000/api/v1/calls/${callId}/connect`, {
        method: 'POST'
      });

      console.log('통화 시작됨!');
    };

    endCallBtn.onclick = async () => {
      // 1. 통화 종료
      await fetch(`http://localhost:3000/api/v1/calls/${callId}/end`, {
        method: 'POST'
      });

      // 2. 연결 종료
      if (peerConnection) {
        peerConnection.close();
      }
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      if (socket) {
        socket.emit('leave-session', { sessionId, peerId: 'client-peer' });
        socket.disconnect();
      }

      console.log('통화 종료됨!');
    };
  </script>
</body>
</html>
```

## WebSocket 이벤트

### 클라이언트 → 서버

| 이벤트 | 데이터 | 설명 |
|--------|--------|------|
| `join-session` | `{ sessionId, peerId }` | 세션 참여 |
| `offer` | `{ sessionId, peerId, offer }` | WebRTC Offer 전송 |
| `answer` | `{ sessionId, peerId, answer }` | WebRTC Answer 전송 |
| `ice-candidate` | `{ sessionId, peerId, candidate }` | ICE Candidate 전송 |
| `leave-session` | `{ sessionId, peerId }` | 세션 나가기 |
| `audio-data` | `{ sessionId, peerId, audioData, timestamp }` | 오디오 데이터 전송 |

### 서버 → 클라이언트

| 이벤트 | 데이터 | 설명 |
|--------|--------|------|
| `joined-session` | `{ sessionId, peerId }` | 세션 참여 완료 |
| `peer-joined` | `{ peerId }` | 다른 피어 참여 |
| `offer` | `{ peerId, offer }` | WebRTC Offer 수신 |
| `answer` | `{ peerId, answer }` | WebRTC Answer 수신 |
| `ice-candidate` | `{ peerId, candidate }` | ICE Candidate 수신 |
| `peer-left` | `{ peerId }` | 피어 나감 |
| `peer-disconnected` | `{ peerId }` | 피어 연결 끊김 |

## 통화 상태 흐름

```
INITIATING → RINGING → CONNECTING → IN_PROGRESS → ENDED
     ↓           ↓          ↓
   FAILED      FAILED    FAILED
```

## 프로젝트 구조

```
src/modules/calls/
├── domain/                         # 도메인 레이어
│   ├── entities/
│   │   └── Call.entity.ts         # 통화 엔티티
│   ├── value-objects/
│   │   ├── CallStatus.vo.ts       # 통화 상태
│   │   └── PhoneNumber.vo.ts      # 전화번호
│   ├── repositories/
│   │   └── CallRepository.interface.ts
│   └── exceptions/                # 도메인 예외
│
├── application/                    # 애플리케이션 레이어
│   ├── use-cases/
│   │   ├── InitiateCall.use-case.ts
│   │   ├── ConnectCall.use-case.ts
│   │   ├── EndCall.use-case.ts
│   │   └── ProcessAIConversation.use-case.ts
│   ├── services/
│   │   ├── AIConversationService.ts      # ChatGPT 통합
│   │   └── WebRTCConfigService.ts        # WebRTC 설정
│   └── dto/
│
├── infrastructure/                 # 인프라 레이어
│   └── repositories/
│       └── CallRepository.ts      # 리포지토리 구현
│
├── presentation/                   # 프레젠테이션 레이어
│   ├── controllers/
│   │   └── CallsController.ts     # REST API
│   └── gateways/
│       └── SignalingGateway.ts    # WebSocket
│
└── Calls.module.ts
```

## ChatGPT 기능

### 1. 음성 → 텍스트 (STT)
- **Whisper API** 사용
- 한국어/영어 자동 인식

### 2. AI 응답 생성
- **GPT-4o** 모델 사용
- 대화 히스토리 기반 컨텍스트 유지
- 커스텀 시스템 프롬프트 지원

### 3. 텍스트 → 음성 (TTS)
- **TTS-1** 모델 사용
- 6가지 음성 선택 가능 (alloy, echo, fable, onyx, nova, shimmer)

### 4. 감정 분석
- 사용자 메시지 감정 분석
- positive/neutral/negative + 점수

## 환경 변수

| 변수 | 설명 | 기본값 |
|------|------|--------|
| `PORT` | 서버 포트 | `3000` |
| `OPENAI_API_KEY` | OpenAI API 키 | **필수** |
| `OPENAI_MODEL` | ChatGPT 모델 | `gpt-4o` |
| `STUN_SERVER_URL` | STUN 서버 URL | `stun:stun.l.google.com:19302` |

## 보안 고려사항

1. **HTTPS 필수**: 프로덕션에서는 반드시 HTTPS 사용
2. **CORS 설정**: `.env`에서 `CORS_ORIGIN` 제한
3. **인증/인가**: JWT 토큰 기반 인증 추가 권장
4. **Rate Limiting**: API 요청 제한
5. **OpenAI API 키**: 환경 변수로 안전하게 관리

## 성능 최적화

1. **WebRTC 코덱**: Opus 오디오 코덱 사용 (저대역폭)
2. **ICE Candidate Pool**: 빠른 연결을 위해 미리 생성
3. **Bundle Policy**: `max-bundle`로 미디어 스트림 효율화
4. **대화 히스토리**: 최근 N개만 유지 (메모리 절약)

## 트러블슈팅

### WebRTC 연결 실패
- 방화벽/NAT 설정 확인
- STUN 서버 접근 가능 여부 확인
- 브라우저 콘솔에서 ICE candidate 상태 확인

### AI 응답 없음
- `OPENAI_API_KEY` 설정 확인
- OpenAI API 사용량 확인
- 네트워크 연결 확인

### 음성 인식 실패
- 오디오 포맷 확인 (WebM, MP3, WAV 지원)
- 마이크 권한 확인
- 오디오 품질 확인

## 라이센스

UNLICENSED

## 지원

- 이슈: [GitHub Issues](https://github.com/your-repo/issues)
- 문서: [Swagger API Docs](http://localhost:3000/api/docs)
