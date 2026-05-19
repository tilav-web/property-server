# Socket.IO API — Mobile dasturchi uchun

Loyihada **Socket.IO v4** ishlatiladi. Hozircha 2 ta namespace mavjud:

| Namespace | Maqsad | Auth |
|-----------|--------|------|
| `/chat` | Foydalanuvchilar orasidagi real-time chat (1:1 + AI agent) | User JWT |
| `/admin-notifications` | Admin uchun real-time notification (yangi to'lov va h.k.) | Admin JWT |

Mobile ilovada faqat `/chat` namespace kerak (admin panel mobile'da emas).

---

## 1. Server ulanish

| Muhit | URL |
|-------|-----|
| Local dev | `http://localhost:3000` |
| Stage / sandbox | `https://stage.amaar.uz` |
| Production (UZ) | `https://amaar.uz` |
| Production (MY) | `https://amaar.com.my` |

**Transport**: `websocket` (polling fallback yo'q, mobile uchun tezroq).

**CORS / credentials**: serverda `withCredentials: true` qabul qilinadi.

---

## 2. Authentication

Server **`access_token`** (JWT) talab qiladi. 3 ta usul qo'llab-quvvatlanadi:

```dart
// Tavsiya — auth handshake (eng ishonchli):
final socket = IO.io(
  'https://amaar.uz/chat',
  IO.OptionBuilder()
      .setTransports(['websocket'])
      .disableAutoConnect()
      .setAuth({'token': accessToken})  // <-- shu yerda
      .build(),
);
socket.connect();
```

Yoki:
- `Authorization: Bearer <accessToken>` header
- `?token=<accessToken>` query parameter

> Token noto'g'ri yoki yo'q bo'lsa, server **darhol disconnect** qiladi (`disconnect` event handler chaqiriladi). Login flow:
> 1. `POST /users/auth/login` orqali `access_token` oling
> 2. Socket'ni `access_token` bilan ulang
> 3. Token muddati tugasa, `POST /users/auth/refresh-token` orqali yangilang
> 4. Socket'ni qayta ulang (yangi token bilan)

---

## 3. `/chat` namespace

### 3.1 Connect

```dart
import 'package:socket_io_client/socket_io_client.dart' as IO;

final socket = IO.io(
  '$BASE_URL/chat',
  IO.OptionBuilder()
      .setTransports(['websocket'])
      .setAuth({'token': accessToken})
      .enableReconnection()
      .setReconnectionAttempts(double.maxFinite.toInt())
      .setReconnectionDelay(1000)
      .setReconnectionDelayMax(5000)
      .build(),
);

socket.onConnect((_) => print('connected'));
socket.onDisconnect((_) => print('disconnected'));
socket.onConnectError((err) => print('connect error: $err'));
```

Connect bo'lgach, server avtomatik:
- Foydalanuvchini `user:{userId}` room'iga qo'shadi (direct push uchun)
- Conversation room'lariga **avtomatik qo'shmaydi** — har bir conversation uchun alohida `chat:subscribe` chaqirish kerak.

---

### 3.2 Server → Client eventlari

#### `chat:new_message`
Yangi xabar kelganda.

**Qachon yuboriladi:**
- Conversation room'iga (`chat:subscribe` qilingan ulanishlar)
- Peer foydalanuvchining barcha qurilmalariga (boshqa tab/mobile)
- Yuboruvchining boshqa qurilmalariga (echo, sync uchun)

**Payload:**
```ts
{
  _id: string;             // message ObjectId
  conversation: string;    // conversation ObjectId
  sender: string;          // sender user ObjectId
  type: 'text' | 'property_reference' | 'price_offer' | 'system';
  body: string;
  metadata: object | null; // turi'ga qarab qo'shimcha (masalan, propertyId)
  readBy: string[];        // shu xabarni o'qigan user ID'lar
  createdAt: string;       // ISO 8601
}
```

```dart
socket.on('chat:new_message', (data) {
  final msg = ChatMessage.fromJson(data);
  // UI ga qo'shish
});
```

#### `chat:read_receipt`
Conversation'dagi xabarlar boshqa tomon tomonidan o'qildi.

**Payload:**
```ts
{
  conversationId: string;
  userId: string;  // KIM o'qigan (sizning ID bo'lishi mumkin — multi-device sync uchun)
}
```

#### `chat:typing`
Boshqa tomon yozayotgani (yoki yozishni to'xtatgani).

**Payload:**
```ts
{
  conversationId: string;
  userId: string;
  typing: boolean;
}
```

> ⚠️ Bu event AI agentdan ham keladi: foydalanuvchi AI'ga xabar yuborganda, AI javob tayyorlayotgan vaqtda `typing: true` keladi, javob tayyor bo'lganda `typing: false`.

#### `notification:new`
Yangi notification (sizga). Push notification ko'rsatish uchun.

**Payload:**
```ts
{
  type: 'text' | 'price_offer' | ...;
  conversationId: string;
}
```

---

### 3.3 Client → Server eventlari

Har bir client → server event uchun server **acknowledgment** qaytaradi (callback). Acknowledgment `{ ok: boolean, ... }` shaklida.

#### `chat:subscribe`
Conversation room'iga qo'shilish. Bundan keyin shu conversation'dagi `chat:new_message`, `chat:typing` eventlarini olasiz.

```dart
socket.emitWithAck('chat:subscribe', {
  'conversationId': conversationId,
}, ack: (data) {
  if (data['ok']) print('subscribed');
});
```

**Validation:** server siz shu conversation ishtirokchisi ekanligingizni tekshiradi. Aks holda `{ ok: false }`.

#### `chat:unsubscribe`
Conversation room'idan chiqish (chat sahifasidan chiqqanda).

```dart
socket.emit('chat:unsubscribe', {'conversationId': conversationId});
```

#### `chat:send`
Xabar yuborish.

**Payload:**
```ts
{
  conversationId: string;  // 24-char ObjectId
  body: string;            // 1-2000 belgi
}
```

**Acknowledgment:**
```ts
// Muvaffaqiyatli:
{ ok: true, id: string }   // yangi message _id

// Xato:
{ ok: false, error: 'unauthenticated' | 'invalid_payload' | 'send_failed' }
```

```dart
socket.emitWithAck('chat:send', {
  'conversationId': conversationId,
  'body': 'Salom!',
}, ack: (data) {
  if (data['ok']) print('sent: ${data['id']}');
});
```

> 💡 `chat:send` muvaffaqiyatli bo'lsa, server siz va peer'ga `chat:new_message` event ham yuboradi. Demak ack'ni kutish shart emas — UI optimistik bo'ladi va `chat:new_message`'da rasmiy yangilanadi.

#### `chat:typing`
"Foydalanuvchi yozmoqda..." indicator.

```dart
// Yozayotganda
socket.emit('chat:typing', {
  'conversationId': conversationId,
  'typing': true,
});

// 2 soniya keyin to'xtagan bo'lsa
Timer(Duration(seconds: 2), () {
  socket.emit('chat:typing', {
    'conversationId': conversationId,
    'typing': false,
  });
});
```

#### `chat:mark_read`
Conversation'dagi xabarlarni o'qilgan deb belgilash (chat ochilganda).

```dart
socket.emit('chat:mark_read', {'conversationId': conversationId});
```

Server ikkala tomonga (siz va peer) `chat:read_receipt` event yuboradi.

---

### 3.4 Misol — to'liq chat oqimi (Dart/Flutter)

```dart
class ChatSocket {
  late IO.Socket _socket;
  final String accessToken;

  ChatSocket(this.accessToken);

  void connect() {
    _socket = IO.io(
      '$BASE_URL/chat',
      IO.OptionBuilder()
          .setTransports(['websocket'])
          .setAuth({'token': accessToken})
          .enableReconnection()
          .build(),
    );

    _socket.onConnect((_) => print('chat connected'));
    _socket.onDisconnect((_) => print('chat disconnected'));

    // Yangi xabar
    _socket.on('chat:new_message', (data) {
      final msg = ChatMessage.fromJson(data as Map<String, dynamic>);
      messagesController.add(msg);
    });

    // Typing indicator
    _socket.on('chat:typing', (data) {
      typingController.add(TypingEvent.fromJson(data));
    });

    // O'qildi
    _socket.on('chat:read_receipt', (data) {
      readReceiptController.add(ReadReceiptEvent.fromJson(data));
    });

    // Push notification
    _socket.on('notification:new', (data) {
      // Local notification ko'rsatish
      showLocalNotification(data);
    });
  }

  Future<bool> openConversation(String conversationId) async {
    final completer = Completer<bool>();
    _socket.emitWithAck('chat:subscribe', {
      'conversationId': conversationId,
    }, ack: (data) {
      completer.complete(data['ok'] == true);
    });
    return completer.future;
  }

  void closeConversation(String conversationId) {
    _socket.emit('chat:unsubscribe', {'conversationId': conversationId});
  }

  Future<String?> sendMessage(String conversationId, String body) async {
    final completer = Completer<String?>();
    _socket.emitWithAck('chat:send', {
      'conversationId': conversationId,
      'body': body,
    }, ack: (data) {
      completer.complete(data['ok'] == true ? data['id'] as String : null);
    });
    return completer.future;
  }

  void setTyping(String conversationId, bool typing) {
    _socket.emit('chat:typing', {
      'conversationId': conversationId,
      'typing': typing,
    });
  }

  void markRead(String conversationId) {
    _socket.emit('chat:mark_read', {'conversationId': conversationId});
  }

  void disconnect() => _socket.disconnect();
}
```

---

## 4. REST API — Socket bilan birga ishlatish

Socket faqat real-time uchun. Tarixiy ma'lumotlar REST orqali:

| Endpoint | Maqsad | Auth |
|----------|--------|------|
| `GET /chat/conversations` | Foydalanuvchining barcha conversation'lari | Bearer |
| `GET /chat/conversations/:id` | Bitta conversation detail | Bearer |
| `GET /chat/conversations/:id/messages?before=&limit=30` | Xabarlar tarixi (paginatsiya) | Bearer |
| `POST /chat/conversations` | Conversation yaratish/topish | Bearer |
| `POST /chat/messages` | Xabar yuborish (Socket'siz fallback) | Bearer |
| `PATCH /chat/conversations/:id/read` | O'qilgan deb belgilash | Bearer |
| `GET /chat/unread-count` | Umumiy o'qilmagan xabarlar soni | Bearer |
| `GET /chat/ai-conversation` | AI yordamchi bilan conversation olish/yaratish | Bearer |

**Tavsiya etilgan flow:**
1. App ochilganda: `GET /chat/conversations` (oxirgi 20-30 ta)
2. Socket'ni ulash
3. Conversation ochilganda: `GET /chat/conversations/:id/messages` (tarix) + `chat:subscribe`
4. Real-time `chat:new_message` event'lari list'ga qo'shiladi
5. Scroll up: `GET ?before=oldestMessageId&limit=30` (eski xabarlar)

---

## 5. Xato kodlari va connection lifecycle

### Connection xatolar

| Sabab | Hodisa | Mobile harakati |
|-------|--------|-----------------|
| Token yo'q | Server `disconnect(true)` chaqiradi | Login sahifaga yo'naltirish |
| Token noto'g'ri | Server `disconnect(true)` chaqiradi | Refresh token'ni sinab ko'rish |
| Token expired | Server `disconnect(true)` chaqiradi | Refresh token + qayta ulanish |
| Network yo'q | `onDisconnect` chaqiriladi | Auto-reconnect (Socket.IO o'zi qiladi) |
| Server o'chgan | `onDisconnect` chaqiriladi | Auto-reconnect (delay bilan) |

### Reconnection

Socket.IO avtomatik reconnect qiladi:
- Birinchi urinish: 1s dan keyin
- Keyin: eksponensial (max 5s)
- Cheksiz urinish (`reconnectionAttempts: Infinity`)

**Token yangilangach** (refresh-token'dan keyin):
```dart
socket.disconnect();
socket.auth = {'token': newAccessToken};
socket.connect();
```

### Background/Foreground

Mobile ilova background'ga o'tganda Socket.IO o'z-o'zidan disconnect bo'lmaydi, lekin iOS/Android operatsion sistemasi WebSocket'ni to'xtatishi mumkin.

**Tavsiya:**
- App foreground'ga qaytganda: `socket.connect()` (agar disconnected bo'lsa)
- Push notification (FCM/APNs) — Socket bilan birga ishlatish (Socket online bo'lganda push'siz, offline'da push)

---

## 6. `/admin-notifications` namespace (admin uchun, mobile'da kerak emas)

Hozircha admin panel faqat web'da. Mobile uchun kerak emas. Lekin kelajakda admin mobile app qilinsa:

- Namespace: `/admin-notifications`
- Auth: **admin_access_token** (boshqa secret — `ADMIN_JWT_SECRET`)
- Events:
  - Server → client: `notification:new` payload: `{ type, title, body, link, payload }`
- Client → server eventlari yo'q (faqat listen)

---

## 7. Tezkor checklist — mobile dasturchi uchun

- [ ] `socket_io_client` (Dart) yoki `socket.io-client` (RN) paketini o'rnatish
- [ ] `BASE_URL/chat` ga `auth: { token: accessToken }` bilan ulanish
- [ ] `chat:new_message`, `chat:typing`, `chat:read_receipt`, `notification:new` listen qilish
- [ ] Chat ochilganda: REST'dan tarix yuklash + `chat:subscribe`
- [ ] Xabar yuborish: `chat:send` (acknowledgment'ni ishlatish — message ID kerak)
- [ ] Chat sahifasidan chiqqanda: `chat:unsubscribe`
- [ ] Token yangilanganda: socket'ni qayta ulash
- [ ] Background → foreground: `socket.connected` tekshirib, kerak bo'lsa `connect()`
- [ ] Connection xato'larga reaksiya: 401-ga teng → login sahifa, network → kuting

---

## 8. Test (Postman / wscat / Bruno)

WebSocket'ni Postman'da test qilish:
1. Yangi WebSocket request
2. URL: `wss://amaar.uz/chat`
3. Headers: `Authorization: Bearer <accessToken>`
4. Send: `42["chat:subscribe",{"conversationId":"..."}]` (Socket.IO v4 frame format)

Yoki `wscat`:
```bash
wscat -c "wss://amaar.uz/chat" -H "Authorization: Bearer <token>"
```

Eng oson — `socket.io-client` bilan oddiy `index.js` test:
```js
const io = require('socket.io-client');
const socket = io('https://amaar.uz/chat', {
  transports: ['websocket'],
  auth: { token: '<accessToken>' },
});
socket.on('connect', () => console.log('OK'));
socket.on('chat:new_message', console.log);
```

---

## Savol va xato hisobotlari

Backend kodi: `src/modules/chat/chat.gateway.ts`, `src/modules/chat/chat.service.ts`

Yangi event yoki o'zgartirish kerak bo'lsa — backend dasturchiga so'rang. Frontend (web) misol kodi: `client/src/lib/socket.ts`, `client/src/hooks/use-realtime.ts`.
