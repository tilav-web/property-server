# Auth API - Mobile dasturchi uchun qo'llanma

Mobile ilovada foydalanuvchini autentifikatsiya qilish usullari.

## 1. Mavjud usullar

| Usul | Endpoint | Holat | Tavsif |
|------|----------|-------|--------|
| Email + parol | `POST /users/auth/login` | ✅ ishlaydi | Klassik login |
| Phone + OTP | `POST /users/auth/register` + `confirm-otp` | ✅ UZ ishlaydi | Eskiz SMS (faqat UZ) |
| **Google (native)** | `POST /users/auth/google/mobile` | ✅ **yangi** | Native SDK orqali |
| Apple (native) | `POST /users/auth/apple/mobile` | ⚠️ placeholder | Kelajakda |
| Facebook | - | ❌ | Faqat web (mobile uchun yo'q) |

**Tavsiya etilgan mobile flow:**
1. Asosiy: **Google Sign-In** (eng oson, hamma uchun ishlaydi)
2. Qo'shimcha: **Email + parol**
3. UZ uchun: Phone + OTP (Eskiz)
4. iOS uchun majburiy: Apple Sign-In (kelajakda)

---

## 2. Google Sign-In (mobile native)

### 2.1 Server endpoint

```
POST https://api.amaar.uz/users/auth/google/mobile
Content-Type: application/json

{
  "idToken": "eyJhbGciOiJSUzI1NiIsImtpZCI6..."
}
```

**Response (200):**
```json
{
  "user": {
    "_id": "665f1f1f1f1f1f1f1f1f1f1f",
    "first_name": "Ali",
    "last_name": "Valiyev",
    "email": { "value": "ali@gmail.com", "isVerified": true },
    "avatar": "https://lh3.googleusercontent.com/...",
    "role": "physical",
    ...
  },
  "access_token": "eyJ...",
  "refresh_token": "eyJ..."
}
```

**Errors:**
- `401` — `Google token noto'g'ri yoki muddati o'tgan`
- `400` — DTO validation (idToken yo'q)
- `429` — throttle (5 ta 10 soniyada)

### 2.2 Flutter (Google Sign-In SDK)

`pubspec.yaml`:
```yaml
dependencies:
  google_sign_in: ^6.2.0
  dio: ^5.4.0
```

**iOS:** `ios/Runner/Info.plist` ga URL scheme qo'shing
**Android:** `android/app/build.gradle` ga client ID

```dart
import 'package:google_sign_in/google_sign_in.dart';
import 'package:dio/dio.dart';

class AuthService {
  final _googleSignIn = GoogleSignIn(
    scopes: ['email', 'profile'],
    // serverClientId: web client ID (Android uchun zarur),
    // bu sizning .env GOOGLE_CLIENT_ID
    serverClientId: '<WEB_CLIENT_ID>.apps.googleusercontent.com',
  );

  final _dio = Dio(BaseOptions(baseUrl: 'https://api.amaar.uz'));

  Future<AuthResult?> signInWithGoogle() async {
    try {
      // 1. Native Google login modal
      final account = await _googleSignIn.signIn();
      if (account == null) return null; // user cancelled

      // 2. ID Token olish
      final auth = await account.authentication;
      final idToken = auth.idToken;
      if (idToken == null) throw Exception('idToken yo\'q');

      // 3. Server'ga yuborish
      final response = await _dio.post(
        '/users/auth/google/mobile',
        data: {'idToken': idToken},
      );

      return AuthResult(
        user: response.data['user'],
        accessToken: response.data['access_token'],
        refreshToken: response.data['refresh_token'],
      );
    } catch (e) {
      print('Google sign-in error: $e');
      rethrow;
    }
  }

  Future<void> signOut() async {
    await _googleSignIn.signOut();
    // Local tokens'ni ham o'chiring (SharedPreferences/SecureStorage)
  }
}
```

### 2.3 React Native (Google Sign-In SDK)

```bash
npm install @react-native-google-signin/google-signin axios
```

```typescript
import {
  GoogleSignin,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import axios from 'axios';

const API_BASE = 'https://api.amaar.uz';

GoogleSignin.configure({
  webClientId: '<WEB_CLIENT_ID>.apps.googleusercontent.com', // .env GOOGLE_CLIENT_ID
  // iosClientId: '<IOS_CLIENT_ID>.apps.googleusercontent.com',
  offlineAccess: false,
  scopes: ['email', 'profile'],
});

export async function signInWithGoogle() {
  try {
    await GoogleSignin.hasPlayServices();
    const userInfo = await GoogleSignin.signIn();
    const idToken = userInfo.idToken;

    if (!idToken) throw new Error('idToken yo\'q');

    const { data } = await axios.post(`${API_BASE}/users/auth/google/mobile`, {
      idToken,
    });

    // data: { user, access_token, refresh_token }
    await saveTokens(data.access_token, data.refresh_token);
    return data;
  } catch (error: any) {
    if (error.code === statusCodes.SIGN_IN_CANCELLED) {
      console.log('Cancelled');
    } else {
      throw error;
    }
  }
}
```

### 2.4 Google Cloud Console sozlash

Backend `GOOGLE_MOBILE_CLIENT_IDS` env'iga mobile client ID lar kerak.

1. [Google Cloud Console](https://console.cloud.google.com) - APIs & Services - Credentials
2. **Web application** uchun OAuth client (avval mavjud) - bu `GOOGLE_CLIENT_ID`
3. **iOS** uchun yangi OAuth client - Bundle ID kiriting (com.amaar.app) - bu **mobile client ID**
4. **Android** uchun yangi OAuth client - package name + SHA-1 fingerprint - bu yana bir **mobile client ID**

Backend `.env`:
```bash
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com           # web
GOOGLE_CLIENT_SECRET=GOCSPX-...
GOOGLE_CALLBACK_URL=https://api.amaar.uz/api/users/auth/google/callback
# Mobile client IDs (iOS + Android) - vergul orqali
GOOGLE_MOBILE_CLIENT_IDS=ios-xxx.apps.googleusercontent.com,android-yyy.apps.googleusercontent.com
```

Server idToken'ni verify qilganda `aud` field shu ID lardan biri bo'lishini tekshiradi.

---

## 3. Email + parol login

### 3.1 Login

```
POST /users/auth/login
Content-Type: application/json
x-client-type: mobile          # MAJBURIY mobile uchun

{
  "identifier": "ali@example.com",  // yoki phone
  "password": "Password123"
}
```

**Response (mobile):**
```json
{
  "user": { ... },
  "access_token": "eyJ...",
  "refresh_token": "eyJ..."     // mobile uchun body'da (web'da cookie'da)
}
```

> `x-client-type: mobile` header MAJBURIY - aks holda server cookie ishlatadi va `refresh_token` body'da bo'lmaydi.

### 3.2 Register (phone + OTP)

Faqat O'zbekiston uchun (Eskiz SMS).

```
POST /users/auth/register
{ "phone": "998901234567", "password": "...", ... }
-> { "userId": "...", "message": "OTP yuborildi" }

POST /users/auth/confirm-otp
x-client-type: mobile
{ "id": "<userId>", "otp": "123456" }
-> { user, access_token, refresh_token }
```

---

## 4. Token boshqarish

### 4.1 Access token ishlatish

Har bir himoyalangan endpoint chaqirilganda:
```
Authorization: Bearer <access_token>
```

### 4.2 Token muddati

| Token | Muddati |
|-------|---------|
| `access_token` | 15 daqiqa |
| `refresh_token` | 7 kun |

### 4.3 Refresh

```
POST /users/auth/refresh-token
Content-Type: application/json
x-client-type: mobile

{
  "refresh_token": "<saqlangan refresh token>"
}

Response:
{
  "access_token": "<yangi>",
  "refresh_token": "<yangi>"  // refresh rotation
}
```

### 4.4 Mobile'da saqlash

| Token | Saqlash joyi |
|-------|--------------|
| `access_token` | Memory (RAM) - har restart'da refresh orqali yangilash |
| `refresh_token` | **Secure storage** (Keychain iOS / EncryptedSharedPreferences Android) |

Flutter: `flutter_secure_storage` paketi
RN: `react-native-keychain` paketi

---

## 5. Logout

Server'da:
```
POST /users/auth/logout
Authorization: Bearer <access_token>
```

Mobile'da:
1. Google: `GoogleSignin.signOut()`
2. Local: barcha tokens'ni o'chirish (Keychain/Keystore'dan)

---

## 6. To'liq Dart misol (AuthRepository)

```dart
import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:google_sign_in/google_sign_in.dart';

class AuthRepository {
  final Dio _dio;
  final _storage = const FlutterSecureStorage();
  final _googleSignIn = GoogleSignIn(
    scopes: ['email', 'profile'],
    serverClientId: const String.fromEnvironment('GOOGLE_WEB_CLIENT_ID'),
  );

  AuthRepository(this._dio) {
    // Auto refresh interceptor
    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        final token = await _storage.read(key: 'access_token');
        if (token != null) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        options.headers['x-client-type'] = 'mobile';
        handler.next(options);
      },
      onError: (e, handler) async {
        if (e.response?.statusCode == 401) {
          // Try refresh
          final refreshed = await _refresh();
          if (refreshed) {
            return handler.resolve(await _dio.fetch(e.requestOptions));
          }
        }
        handler.next(e);
      },
    ));
  }

  Future<Map?> signInWithGoogle() async {
    final account = await _googleSignIn.signIn();
    if (account == null) return null;
    final auth = await account.authentication;
    final idToken = auth.idToken!;

    final res = await _dio.post(
      '/users/auth/google/mobile',
      data: {'idToken': idToken},
    );
    await _saveTokens(res.data['access_token'], res.data['refresh_token']);
    return res.data['user'] as Map;
  }

  Future<Map?> signInWithEmail(String email, String password) async {
    final res = await _dio.post(
      '/users/auth/login',
      data: {'identifier': email, 'password': password},
    );
    await _saveTokens(res.data['access_token'], res.data['refresh_token']);
    return res.data['user'] as Map;
  }

  Future<bool> _refresh() async {
    final refresh = await _storage.read(key: 'refresh_token');
    if (refresh == null) return false;
    try {
      final res = await _dio.post(
        '/users/auth/refresh-token',
        data: {'refresh_token': refresh},
        options: Options(headers: {'Authorization': null}), // skip interceptor
      );
      await _saveTokens(res.data['access_token'], res.data['refresh_token']);
      return true;
    } catch (_) {
      await _clearTokens();
      return false;
    }
  }

  Future<void> _saveTokens(String access, String refresh) async {
    await _storage.write(key: 'access_token', value: access);
    await _storage.write(key: 'refresh_token', value: refresh);
  }

  Future<void> _clearTokens() async {
    await _storage.deleteAll();
  }

  Future<void> signOut() async {
    try {
      await _dio.post('/users/auth/logout');
    } catch (_) {}
    await _googleSignIn.signOut();
    await _clearTokens();
  }
}
```

---

## 7. Xato kodlari

Barcha auth endpoint'lar `{ statusCode, message, code? }` qaytaradi:

```json
{
  "statusCode": 401,
  "message": "Sessiya muddati tugagan. Iltimos qayta tizimga kiring.",
  "code": "token_expired"
}
```

| code | Mobile harakati |
|------|-----------------|
| `token_expired` | Refresh urinish, bo'lmasa login sahifa |
| `token_invalid` | Login sahifa |
| `token_missing` | Login sahifa |
| `user_not_found` | Login sahifa |
| `unauthorized` | Login sahifa |

---

## 8. Tezkor checklist - mobile dasturchi

- [ ] Google Cloud Console: iOS + Android OAuth client yarating
- [ ] Backend'ga client ID larni bering (GOOGLE_MOBILE_CLIENT_IDS)
- [ ] `google_sign_in` (Flutter) yoki `@react-native-google-signin` (RN) o'rnatish
- [ ] iOS: URL scheme, Android: `google-services.json` qo'shish
- [ ] `signInWithGoogle()` -> `POST /users/auth/google/mobile`
- [ ] Tokens'ni Secure Storage'da saqlash
- [ ] Dio/Axios interceptor: Bearer header + auto-refresh
- [ ] Email login: `x-client-type: mobile` header qo'shing
- [ ] Logout: server logout + GoogleSignin.signOut() + local clear

---

## Boshqa hujjatlar
- Socket.IO real-time API: [SOCKET_API.md](./SOCKET_API.md)
- Server deploy: [DEPLOY.md](./DEPLOY.md)
- Swagger UI: https://api.amaar.uz/api/docs
