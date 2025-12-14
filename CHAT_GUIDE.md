# 📱 WebSocket 채팅 시스템 가이드

## 🎯 개요

기존 전화 시스템과 동일한 AI 기능을 제공하는 **WebSocket 기반 실시간 채팅 시스템**입니다.

### 주요 기능

- ✅ **실시간 텍스트 채팅** (Socket.IO)
- ✅ **AI 대화 통합** (GPT-4o)
- ✅ **복지 서비스 검색** (Function Calling)
- ✅ **대화 히스토리 유지** (최근 20개 메시지)
- ✅ **세션 관리** (30분 타임아웃)
- ✅ **데이터베이스 저장** (TypeORM)

---

## 🚀 시작하기

### 1. 서버 실행

```bash
# 개발 모드
npm run dev

# 프로덕션 모드
npm run build
npm run start:prod
```

### 2. WebSocket 연결

**Endpoint**: `ws://localhost:3000/chat`

---

## 📡 WebSocket 이벤트

### 클라이언트 → 서버

#### 1. `join-chat` - 채팅 참가

```javascript
socket.emit('join-chat', {
  userId: 'user-123',
  sessionId: 'optional-session-id' // 생략 시 자동 생성
});
```

**응답**:
```javascript
socket.on('chat-joined', (data) => {
  console.log(data);
  // {
  //   sessionId: '550e8400-e29b-41d4-a716-446655440000',
  //   userId: 'user-123',
  //   message: '채팅에 참가했습니다'
  // }
});

socket.on('chat-history', (data) => {
  console.log(data.messages); // 이전 대화 히스토리
});

socket.on('ai-message', (data) => {
  console.log(data.content); // '안녕하세요! 복지 서비스 검색 AI입니다...'
});
```

#### 2. `send-message` - 메시지 전송

```javascript
socket.emit('send-message', {
  sessionId: '550e8400-e29b-41d4-a716-446655440000',
  message: '노인 복지 서비스 알려줘'
});
```

**응답**:
```javascript
socket.on('message-sent', (data) => {
  console.log('전송 확인:', data.content);
});

socket.on('ai-message', (data) => {
  console.log('AI 응답:', data.content);
  // '1. 홍천군 효행장려금
  //     - 담당: 홍천군청 노인복지과
  //     - 연락처: 033-1234
  //
  //  2. 노인성질환예방관리
  //     - 담당: 보건복지부
  //     - 연락처: 044-5678'
});
```

#### 3. `leave-chat` - 채팅 나가기

```javascript
socket.emit('leave-chat', {
  sessionId: '550e8400-e29b-41d4-a716-446655440000'
});
```

**응답**:
```javascript
socket.on('chat-left', (data) => {
  console.log('채팅 종료:', data.sessionId);
});
```

#### 4. `get-history` - 히스토리 조회

```javascript
socket.emit('get-history', {
  sessionId: '550e8400-e29b-41d4-a716-446655440000',
  limit: 50 // 선택 (기본값: 50)
});
```

**응답**:
```javascript
socket.on('chat-history', (data) => {
  console.log(data.messages);
  // [
  //   {
  //     id: 'msg-1',
  //     sender: 'user',
  //     content: '안녕하세요',
  //     createdAt: '2024-12-14T10:30:00.000Z'
  //   },
  //   {
  //     id: 'msg-2',
  //     sender: 'assistant',
  //     content: '안녕하세요! 무엇을 도와드릴까요?',
  //     createdAt: '2024-12-14T10:30:01.000Z'
  //   }
  // ]
});
```

#### 5. `typing` - 타이핑 상태 전송

```javascript
socket.emit('typing', {
  sessionId: '550e8400-e29b-41d4-a716-446655440000',
  isTyping: true
});
```

### 서버 → 클라이언트

#### 1. `chat-joined` - 참가 완료

```javascript
socket.on('chat-joined', (data) => {
  // { sessionId, userId, message }
});
```

#### 2. `chat-history` - 대화 히스토리

```javascript
socket.on('chat-history', (data) => {
  // { messages: [...] }
});
```

#### 3. `ai-message` - AI 응답

```javascript
socket.on('ai-message', (data) => {
  // { content: '...', timestamp: 1702551000000 }
});
```

#### 4. `message-sent` - 메시지 전송 확인

```javascript
socket.on('message-sent', (data) => {
  // { content: '...', timestamp: 1702551000000 }
});
```

#### 5. `chat-left` - 채팅 종료

```javascript
socket.on('chat-left', (data) => {
  // { sessionId }
});
```

#### 6. `user-typing` - 타이핑 상태

```javascript
socket.on('user-typing', (data) => {
  // { isTyping: true }
});
```

#### 7. `error` - 에러

```javascript
socket.on('error', (data) => {
  // { message: '에러 메시지' }
});
```

---

## 💻 클라이언트 예제

### HTML + JavaScript (Socket.IO)

```html
<!DOCTYPE html>
<html>
<head>
  <title>AI 채팅</title>
  <script src="https://cdn.socket.io/4.8.1/socket.io.min.js"></script>
</head>
<body>
  <div id="chat-box"></div>
  <input id="message-input" type="text" placeholder="메시지 입력...">
  <button id="send-btn">전송</button>

  <script>
    const socket = io('http://localhost:3000/chat');
    const userId = 'user-' + Date.now();
    let sessionId = null;

    // 채팅 참가
    socket.emit('join-chat', { userId });

    // 이벤트 핸들러
    socket.on('chat-joined', (data) => {
      sessionId = data.sessionId;
      console.log('참가 완료:', data);
    });

    socket.on('chat-history', (data) => {
      data.messages.forEach(msg => {
        displayMessage(msg.sender, msg.content);
      });
    });

    socket.on('ai-message', (data) => {
      displayMessage('AI', data.content);
    });

    socket.on('message-sent', (data) => {
      displayMessage('나', data.content);
    });

    // 메시지 전송
    document.getElementById('send-btn').onclick = () => {
      const input = document.getElementById('message-input');
      const message = input.value.trim();

      if (message && sessionId) {
        socket.emit('send-message', { sessionId, message });
        input.value = '';
      }
    };

    // 메시지 표시
    function displayMessage(sender, content) {
      const chatBox = document.getElementById('chat-box');
      const msgDiv = document.createElement('div');
      msgDiv.innerHTML = `<strong>${sender}:</strong> ${content}`;
      chatBox.appendChild(msgDiv);
      chatBox.scrollTop = chatBox.scrollHeight;
    }

    // Enter 키로 전송
    document.getElementById('message-input').onkeypress = (e) => {
      if (e.key === 'Enter') {
        document.getElementById('send-btn').click();
      }
    };
  </script>
</body>
</html>
```

### React 예제

```jsx
import { useEffect, useState } from 'react';
import io from 'socket.io-client';

function ChatApp() {
  const [socket, setSocket] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');

  useEffect(() => {
    const newSocket = io('http://localhost:3000/chat');
    setSocket(newSocket);

    // 채팅 참가
    const userId = 'user-' + Date.now();
    newSocket.emit('join-chat', { userId });

    // 이벤트 핸들러
    newSocket.on('chat-joined', (data) => {
      setSessionId(data.sessionId);
    });

    newSocket.on('chat-history', (data) => {
      setMessages(data.messages.map(msg => ({
        sender: msg.sender === 'user' ? '나' : 'AI',
        content: msg.content
      })));
    });

    newSocket.on('ai-message', (data) => {
      setMessages(prev => [...prev, { sender: 'AI', content: data.content }]);
    });

    newSocket.on('message-sent', (data) => {
      setMessages(prev => [...prev, { sender: '나', content: data.content }]);
    });

    return () => newSocket.close();
  }, []);

  const sendMessage = () => {
    if (input.trim() && sessionId && socket) {
      socket.emit('send-message', { sessionId, message: input });
      setInput('');
    }
  };

  return (
    <div>
      <div style={{ height: '400px', overflowY: 'scroll', border: '1px solid #ccc' }}>
        {messages.map((msg, idx) => (
          <div key={idx}>
            <strong>{msg.sender}:</strong> {msg.content}
          </div>
        ))}
      </div>
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
        placeholder="메시지 입력..."
      />
      <button onClick={sendMessage}>전송</button>
    </div>
  );
}

export default ChatApp;
```

---

## 🗄️ REST API

### 채팅 히스토리 조회

```http
GET /api/v1/chat/sessions/:sessionId/messages
```

**응답**:
```json
{
  "messages": [
    {
      "id": "msg-1",
      "sessionId": "550e8400-e29b-41d4-a716-446655440000",
      "sender": "user",
      "messageType": "TEXT",
      "content": "안녕하세요",
      "createdAt": "2024-12-14T10:30:00.000Z"
    },
    {
      "id": "msg-2",
      "sessionId": "550e8400-e29b-41d4-a716-446655440000",
      "sender": "assistant",
      "messageType": "TEXT",
      "content": "안녕하세요! 무엇을 도와드릴까요?",
      "createdAt": "2024-12-14T10:30:01.000Z"
    }
  ]
}
```

---

## 🔧 기술 스택

### Backend
- **NestJS** - 프레임워크
- **Socket.IO** - WebSocket
- **TypeORM** - ORM
- **OpenAI GPT-4o** - AI 대화

### 데이터베이스 테이블

#### `chat_sessions`
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | varchar(36) | Primary Key |
| user_id | varchar(255) | 사용자 ID |
| session_id | varchar(255) | 세션 ID (unique) |
| is_active | boolean | 활성 상태 |
| last_activity | timestamp | 마지막 활동 |
| created_at | timestamp | 생성 시간 |
| updated_at | timestamp | 수정 시간 |

#### `chat_messages`
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | varchar(36) | Primary Key |
| session_id | varchar(255) | 세션 ID |
| sender | varchar(50) | user/assistant/system |
| message_type | varchar(50) | TEXT/AUDIO/SYSTEM |
| content | text | 메시지 내용 |
| metadata | json | 메타데이터 |
| created_at | timestamp | 생성 시간 |
| updated_at | timestamp | 수정 시간 |

---

## 🎨 기능 특징

### 1. AI 대화

- **GPT-4o** 모델 사용
- **대화 컨텍스트 유지** (최근 20개 메시지)
- **복지 서비스 검색** Function Calling

### 2. 세션 관리

- **자동 세션 생성**: sessionId 생략 시 UUID 자동 생성
- **세션 재사용**: 같은 sessionId로 재참가 가능
- **타임아웃**: 30분 비활성 시 자동 정리
- **주기적 정리**: 5분마다 비활성 세션 제거

### 3. 메시지 저장

- 모든 메시지를 데이터베이스에 저장
- 재접속 시 이전 대화 히스토리 자동 로드
- 최대 50개 메시지 조회

### 4. 에러 핸들링

- 연결 실패 시 `error` 이벤트 전송
- 세션 없음, 메시지 처리 실패 등 명확한 에러 메시지

---

## 🆚 전화 vs 채팅 비교

| 기능 | 전화 시스템 | 채팅 시스템 |
|------|------------|------------|
| **통신** | WebRTC (음성) | WebSocket (텍스트) |
| **Namespace** | `/signaling` | `/chat` |
| **입력** | 음성 (STT) | 텍스트 |
| **출력** | 음성 (TTS) | 텍스트 |
| **AI 모델** | GPT-4o + Whisper + TTS | GPT-4o |
| **대화 히스토리** | 메모리 (최근 20개) | DB + 메모리 (최근 20개) |
| **세션 저장** | 메모리만 | DB + 메모리 |
| **복지 검색** | Function Calling | Function Calling |
| **타임아웃** | 30분 | 30분 |

---

## 📚 API 문서

- **Swagger**: http://localhost:3000/api/docs
- **채팅 태그**: `chat`

---

## 🐛 트러블슈팅

### 1. WebSocket 연결 안 됨

```javascript
// CORS 확인
const socket = io('http://localhost:3000/chat', {
  transports: ['websocket', 'polling']
});
```

### 2. 메시지 전송 안 됨

```javascript
// sessionId 확인
socket.on('chat-joined', (data) => {
  console.log('SessionID:', data.sessionId); // 이거 저장해서 사용
});
```

### 3. AI 응답 느림

- OpenAI API 응답 시간: 2-5초
- Function Calling 사용 시 더 느릴 수 있음

### 4. 세션 타임아웃

- 30분 비활성 시 세션 자동 삭제
- 재접속 시 새 세션 생성됨

---

## 🚀 배포

### 환경 변수

```env
PORT=3000
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=password
DB_NAME=mobok
```

### 프로덕션 모드

```bash
npm run build
npm run start:prod
```

---

## 📞 지원

- **문서**: http://localhost:3000/api/docs
- **헬스체크**: http://localhost:3000/api/v1/health

---

**끝!** 🎉
