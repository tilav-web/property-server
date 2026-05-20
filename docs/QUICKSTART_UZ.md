# UZ deploy - Tezkor qo'llanma (uybos.uz)

Server: `176.101.56.235` (yangi VPS)
Domen: `uybos.uz`, `api.uybos.uz` (DNS allaqachon sozlangan ✓)

## ⚠️ XAVFSIZLIK - BIRINCHI QADAM

Chatda **root parolni va boshqa credentials**ni ochiq yozdingiz. Darhol o'zgartiring:

```bash
# Serverga ulangach:
passwd                                                   # root parol o'zgartirish
# Yoki yaxshiroq - SSH key qo'shing va parol bilan loginni o'chiring:
sed -i 's/^#*PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
systemctl restart sshd

# Boshqa credentialslar (DO Spaces, OpenAI, Google, Eskiz)
# o'zgartiriladigan bo'lsa - tegishli xizmatlarda yangi keys yarating
```

---

## 1. Serverga ulanish

```bash
ssh root@176.101.56.235
# Parol: <chatda bergan>
```

## 2. Loyihani clone qilish

```bash
mkdir -p /home/property
cd /home/property
git clone https://github.com/system-ats/amaar-properties-backend.git server
git clone https://github.com/system-ats/amaar-properties-web.git client
```

## 3. Backend `.env` yaratish

```bash
cd /home/property/server
cp docs/.env.uz.example .env
nano .env
```

Quyidagilarni to'ldiring (yoki o'zgartiring):

| Field | Qiymat |
|-------|--------|
| `JWT_SECRET` | `openssl rand -hex 32` natija |
| `ADMIN_JWT_SECRET` | yana boshqa `openssl rand -hex 32` |
| `ADMIN_EMAIL` | `admin@uybos.uz` (o'zingiznikini kiriting) |
| `ADMIN_PASSWORD` | **kuchli parol** (kamida 12 belgi) |
| `EMAIL_PASSWORD` | Gmail app password (16 belgi) |
| `GOOGLE_CLIENT_SECRET` | Google OAuth secret |
| `OPENAI_API_KEY` | OpenAI key |
| `DO_SPACES_KEY` / `DO_SPACES_SECRET` | DO Spaces credentials |
| `ESKIZ_PASSWORD` | Eskiz parol |
| `PAYME_MERCHANT_ID` / `PAYME_SECRET_KEY` | Payme sandbox uchun (yoki bo'sh qoldiring keyin qo'shasiz) |

> **MUHIM**: bu .env fayl chatda bergan credentialslarni emas, **yangi tasodifiy** qiymatlarni ishlatsin (`openssl rand -hex 32`).

## 4. Client `.env` yaratish

```bash
cd /home/property/client
cp ../server/docs/.env.uz.client.example .env
# Bu fayl tayyor - hech narsa o'zgartirmasangiz ham bo'ladi
```

## 5. Deploy script ishga tushirish

```bash
cd /home/property/server
bash docs/deploy-uz.sh
```

Skript avtomatik qiladi:
1. Docker, Nginx, Node.js, Certbot o'rnatish
2. Firewall (port 80, 443) ochish
3. Frontend build (`npm ci && npm run build`)
4. Nginx config (`nginx-uybos.conf`) qo'llash
5. Backend Docker compose ishga tushirish (server + MongoDB)
6. SSL sertifikat (Let's Encrypt) - DNS to'g'ri ekanini tasdiqlasangiz

Boshidan oxirigacha ~5-10 daqiqa.

## 6. Tekshirish

Skript tugagach:

```bash
# Healthcheck
curl https://api.uybos.uz/health

# Frontend
# Brauzerda https://uybos.uz oching
```

## 7. Birinchi login

`ADMIN_EMAIL` va `ADMIN_PASSWORD` `.env`dan olib **avtomatik admin yaratiladi** (server boot bo'lganda).

```bash
# Test login
curl -X POST https://api.uybos.uz/admins/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@uybos.uz","password":"<sizning paroldagi>"}'
```

Yoki frontend orqali: `https://uybos.uz/admin/login`

---

## Troubleshooting

### Loglarni ko'rish

```bash
# Server (NestJS)
docker compose -f /home/property/server/docker-compose.yml logs -f server

# Nginx error
tail -f /var/log/nginx/uybos-api-error.log
tail -f /var/log/nginx/uybos-client-error.log
```

### Server ishlamaydi

```bash
docker compose -f /home/property/server/docker-compose.yml ps
docker compose -f /home/property/server/docker-compose.yml restart server
```

### Nginx config xatosi

```bash
nginx -t
systemctl status nginx
```

### MongoDB ulanishi

```bash
docker exec -it property-mongo mongosh
> use property
> db.admins.find()      # admin yaratildimi?
```

### SSL ishlamaydi

DNS to'g'ri sozlanganini tekshiring:

```bash
dig +short uybos.uz
dig +short api.uybos.uz
# Hammasi 176.101.56.235 ko'rsatishi kerak
```

Keyin qo'lda:
```bash
certbot --nginx -d uybos.uz -d www.uybos.uz -d api.uybos.uz
```

---

## Yangilanish (deploy v2)

Keyingi paytda kod yangilanganda:

```bash
cd /home/property/server
git pull
docker compose up -d --build server

cd /home/property/client
git pull
npm ci && npm run build
sudo rm -rf /var/www/uybos-client/*
sudo cp -r dist/* /var/www/uybos-client/
```

Hech qanday restart kerak emas - faqat docker compose va frontend static fayllar yangilanadi.

---

## Payme webhook keyinroq

Payme sandbox/production credentials olganda:
1. `.env` ga `PAYME_MERCHANT_ID` va `PAYME_SECRET_KEY` qo'shing
2. `docker compose restart server`
3. Payme dashboard'da webhook URL: `https://api.uybos.uz/payme/webhook`

---

## Yana qo'shimcha

- Mobile dasturchi uchun: `docs/AUTH_API.md`, `docs/SOCKET_API.md`
- To'liq deploy guide: `docs/DEPLOY.md`
- Hozirgi quick-start: shu fayl
