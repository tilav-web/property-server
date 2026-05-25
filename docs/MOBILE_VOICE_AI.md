# Voice AI bilan property qidirish — Mobile dasturchi uchun

Mobile (iOS/Android/Flutter) ilovada AI chat'da **voice** bilan property qidirish flow'i. Anonim (login bo'lmagan) va auth (login bo'lgan) ikkala holat uchun.

Base URL:
- UZ prod: `https://api.uybos.uz`
- Swagger: `https://api.uybos.uz/docs`

Tarmoq sxemasi:

```
  Foydalanuvchi voice yuboradi
            │
            ▼
  ┌────────────────────────┐
  │ Login bo'lganmi?       │
  └────────────────────────┘
       │             │
       ▼ NO          ▼ YES
  Anonim flow    Auth flow
  (faqat voice)  (conversation'ga voice xabar)
       │             │
       └──────┬──────┘
              ▼
       ┌──────────────┐
       │ 402 keldimi? │ ──► YES → PremiumModal ko'rsatish
       └──────────────┘            (Premium ol → checkoutUrl)
              │
              ▼ NO
       result + audio + properties ko'rsatish
```

---

## 1. ANONIM voice qidiruv (login emas)

### Endpoint
`POST /chat/ai-anonymous/voice` — Content-Type: `multipart/form-data`

Auth: **kerak emas**

### Request

| Field | Type | Required | Izoh |
|---|---|---|---|
| `audio` | file | yes | webm / ogg / mp3 / m4a / wav (max **15 MB**) |
| `history` | string | no | JSON array: `[{"role":"user","content":"..."},{"role":"assistant","content":"..."}]` (oxirgi xabarlar, client tomonida saqlanadi) |
| `language` | string | no | `uz` / `ru` / `en` / `ms` (Whisper STT uchun) |

### Response 200 — muvaffaqiyat

```json
{
  "transcript": "Toshkentda 2 xonali kvartira",
  "body": "Toshkentda 2 xonali kvartiralar topdim...",
  "intro": "Toshkentda 2 xonali kvartiralar topdim.",
  "properties": [
    {
      "_id": "6a1...",
      "title": "Yangi qurilgan kvartira",
      "price": 850000000,
      "currency": "UZS",
      "address": "Toshkent, Yunusobod",
      "photo": "https://...",
      "bedrooms": 2
    }
  ],
  "searchQuery": "2 xonali Toshkent",
  "noResults": false,
  "audioBase64": "SUQzBAAAAA...",
  "audioMimeType": "audio/mpeg",
  "quota": {
    "isPremium": false,
    "remainingToday": 2
  }
}
```

Mobile'da nima qilish:
- `audioBase64` → MP3 sifatida o'ynat (TTS AI javobi)
- `properties` → ro'yxat ko'rinishida ko'rsat (har biri tap → property detail sahifasi)
- `transcript` → "Siz aytdingiz: ..." sifatida ko'rsatsa bo'ladi
- `body` → AI'ning to'liq matnli javobi (chat bubble)
- `quota.remainingToday` → "Bugun yana 2 ta voice qoldi" ko'rinishida ko'rsatish mumkin

### Response 402 — quota tugadi → **Premium modal ko'rsat**

```json
{
  "statusCode": 402,
  "error": "voice_quota_exceeded",
  "message": "Voice bepul kunlik limit (3) tugadi. Premium oling.",
  "dailyLimit": 3,
  "usedToday": 3
}
```

Mobile'da `error === "voice_quota_exceeded"` bo'lsa:
- **Premium modal ochish** (pastdagi §3 ga qarang)
- Foydalanuvchi anonim bo'lgani uchun avval login'ga yo'naltirish kerak (Premium faqat auth user'ga sotiladi)

### Throttle
6 ta so'rov / daqiqa per IP. Oshib ketsa HTTP 429.

---

## 2. AUTH voice qidiruv (login bo'lgan)

Auth voice avval **AI conversation**'ga ulanadi (xabarlar history sifatida saqlanadi).

### 2.1. AI conversation olish (yoki yaratish)

`GET /chat/ai-conversation` — Auth: **Bearer JWT** yoki `access_token` cookie

Response:
```json
{
  "_id": "6a1...",
  "participants": [{"_id": "<sizning_id>"}, {"_id": "<ai_agent_id>"}],
  "lastMessage": {...},
  ...
}
```

`_id` — `conversationId` bu (keyingi qadamlarda ishlatiladi). Bu endpointni faqat **bir marta** (chat ochilganda) chaqirsangiz kifoya.

### 2.2. Voice xabar yuborish

`POST /chat/conversations/:conversationId/voice` — Content-Type: `multipart/form-data`

Auth: **Bearer JWT** yoki cookie

### Request

| Field | Type | Required | Izoh |
|---|---|---|---|
| `audio` | file | yes | webm/ogg/mp3/m4a/wav (max **15 MB**) |
| `language` | string | no | `uz` / `ru` / `en` / `ms` |

> History serverda saqlanadi — qayta yuborish shart emas (anonim flow'dan farq).

### Response 200

```json
{
  "ok": true,
  "transcript": "Toshkentda 2 xonali kvartira",
  "aiBody": "...",
  "properties": [ ... ],
  "audioBase64": "...",
  "audioMimeType": "audio/mpeg",
  "quota": {
    "isPremium": true,
    "remainingToday": 999
  }
}
```

> Premium user uchun `isPremium: true` va `remainingToday: 999` (cheksiz belgisi).

### Response 402 — quota tugadi (faqat non-premium user uchun)

```json
{
  "statusCode": 402,
  "error": "voice_quota_exceeded",
  "message": "Voice bepul kunlik limit (3) tugadi. Premium oling.",
  "dailyLimit": 3,
  "usedToday": 3
}
```

Mobile'da:
- **Premium modal ko'rsat** + "Premium ol" tugmasi

### Throttle
6 ta so'rov / daqiqa per user.

---

## 3. Voice quota holatini oldindan tekshirish

Voice tugmasini disable qilish yoki "Bugun X ta qoldi" ko'rsatish uchun.

`GET /premium/voice/status` — auth optional (anonim user uchun IP bo'yicha, auth user uchun user bo'yicha)

Response:
```json
{
  "isPremium": false,
  "premiumUntil": null,
  "dailyFreeLimit": 3,
  "usedToday": 1,
  "remainingToday": 2,
  "canSend": true
}
```

`canSend: false` bo'lsa voice tugmasini disable qil + UI'da "Premium oling" tooltip.

---

## 4. Premium modal — UI va flow

### 4.1. Foydalanuvchi premium holatini bilish (faqat auth user)

`GET /premium/status` — Auth required

```json
{
  "isPremium": true,
  "until": "2026-06-25T10:30:00.000Z"
}
```

`isPremium: false` bo'lsa "Premium ol" tugmasini ko'rsat.

### 4.2. Premium config (narx + benefit'lar)

`GET /premium/config` — Auth: **kerak emas**

```json
{
  "voiceDailyFreeLimit": 3,
  "freePropertyLimit": 3,
  "premiumPrice": 50000,
  "premiumDurationDays": 30,
  "propertyPremiumDiscountPercent": 50,
  "currency": "UZS"
}
```

Premium modal UI'da ko'rsat:
- **Narx**: `{premiumPrice} {currency}` (= 50,000 UZS)
- **Davomiyligi**: `{premiumDurationDays} kun` (= 30 kun)
- **Benefit'lar (3 ta)**:
  1. 🎤 Cheksiz Voice AI
  2. 🏠 Cheksiz property yaratish (bepul `freePropertyLimit=3` ta)
  3. ✨ Property TOP'ga chiqarishda `{propertyPropertyDiscountPercent}%` chegirma

### 4.3. Premium sotib olish

`POST /premium/upgrade` — Auth required

Body: bo'sh

Response 200:
```json
{
  "transactionId": "6a1...",
  "amount": 50000,
  "currency": "UZS",
  "durationDays": 30,
  "checkoutUrl": "https://checkout.paycom.uz/<base64>",
  "provider": "PAYME"
}
```

Mobile'da:
- `checkoutUrl` ni **in-app browser** yoki **WebView**'da och (Custom Tabs / SFSafariViewController)
- Foydalanuvchi karta orqali to'lashi mumkin
- To'lov muvaffaqiyatli bo'lsa, browser yopiladi va siz `GET /premium/status` ni qayta chaqirib `isPremium: true` bo'lganini ko'rishingiz mumkin
- **Diqqat**: to'lovdan keyin admin tasdig'i kutiladi (`adminApprovalStatus: "AWAITING"`). Premium darhol faollashmaydi — admin tasdiqlagandan keyin faollashadi (odatda 1-2 daqiqa). UI'da "Tasdiqlash kutilmoqda" ko'rsatish mumkin.

Response 400 (`PAYMENT_PROVIDER=none` — Malaysia uchun):
```json
{
  "statusCode": 400,
  "message": "Bu mamlakatda online to'lov mavjud emas (PAYMENT_PROVIDER=none)"
}
```

---

## 5. Mobile flow — yakuniy ketma-ketlik

```
1. App start
   ├─ GET /premium/voice/status   → quota ko'rsat (badge)
   └─ (auth bo'lsa) GET /premium/status → premium badge

2. Foydalanuvchi voice tugmasini bosadi
   ├─ Record audio (max 15 MB)
   ├─ Auth bo'lsa:
   │   ├─ GET /chat/ai-conversation (bir marta cache)
   │   └─ POST /chat/conversations/:id/voice (multipart)
   └─ Anonim bo'lsa:
       └─ POST /chat/ai-anonymous/voice (multipart, history client'da)

3. Response
   ├─ 200 OK
   │   ├─ Play audioBase64 (MP3)
   │   ├─ Show transcript + aiBody
   │   ├─ Show properties[] (tap → /property/:id)
   │   └─ Update quota.remainingToday
   │
   └─ 402 voice_quota_exceeded
       └─ Show PremiumModal
           ├─ Anonim user bo'lsa → "Login qiling" → /auth/login
           └─ Auth user bo'lsa:
               ├─ GET /premium/config (narx + benefit)
               ├─ Tap "Premium ol"
               │   └─ POST /premium/upgrade → checkoutUrl
               │       └─ Open in WebView/Custom Tabs
               └─ To'lov tugagach → GET /premium/status
                   └─ isPremium: true → voice qayta yuborish mumkin
```

---

## 6. Xato kodlari xulosasi

| HTTP | Error | Sabab | Mobile aksiya |
|---|---|---|---|
| 200 | — | success | normal flow |
| 400 | `audio file is required` | audio yo'q | re-record |
| 400 | `Unsupported audio type: ...` | format noto'g'ri | recorder format'ini webm/m4a/mp3'ga o'tkaz |
| 400 | `Voice messages are only supported in AI conversations` | auth user oddiy chat'ga voice yubordi | faqat AI conversation'ga yubor |
| 401 | unauthorized | JWT expired | refresh token |
| 402 | `voice_quota_exceeded` | kunlik limit tugadi | **Premium modal** |
| 429 | throttle | 1 daqiqada 6+ so'rov | snackbar "biroz kuting" |
| 500 | server error | OpenAI/STT/TTS xatosi | retry tavsiya |

---

## 7. Auth haqida (qisqacha)

JWT olish: `POST /users/auth/login` (yoki Google/Facebook/Apple OAuth).

Header'ga qo'shish:
```
Authorization: Bearer <access_token>
```

Yoki cookie (`access_token` HttpOnly) — backend ikkalasini ham qabul qiladi.

Token expired bo'lsa `401` qaytadi. Refresh: `POST /users/auth/refresh-token` (refresh_token cookie kerak).

---

## 8. Telefon raqam orqali login (UZ uchun)

UZ deploy'da `phone_auth_enabled=true`. Endpoint'lar:
- `POST /users/auth/register` — `{ identifier: "+998901234567", password, role }` → SMS yuboriladi
- `POST /users/auth/confirm-otp` — `{ id, code }` → JWT
- `POST /users/auth/login` — `{ identifier, password }`
- `POST /users/auth/forgot-password` — `{ identifier }` → SMS kod

SMS provider: Eskiz.uz (faqat UZ). MY deploy'da phone yo'q, faqat email + OAuth.

---

Swagger to'liq ro'yxat: `https://api.uybos.uz/docs`
