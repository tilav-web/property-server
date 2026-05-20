# Production deploy qo'llanmasi

> **Maqsad:** Amaar Property loyihasini noldan yangi serverga (Ubuntu/Debian VPS) joylashtirib ishga tushirish.

## Mundarija

1. [Server talablari](#1-server-talablari)
2. [Tashqi xizmatlar (oldindan tayyorlash)](#2-tashqi-xizmatlar)
3. [Server tayyorlash](#3-server-tayyorlash)
4. [Kodni clone qilish](#4-kodni-clone-qilish)
5. [Backend .env to'ldirish](#5-backend-env-toldirish)
6. [Docker Compose bilan ishga tushirish](#6-docker-compose-bilan-ishga-tushirish)
7. [Frontend deploy](#7-frontend-deploy)
8. [Domen va HTTPS (Let's Encrypt)](#8-domen-va-https)
9. [Payme webhook sozlash](#9-payme-webhook-sozlash)
10. [Birinchi admin yaratish](#10-birinchi-admin-yaratish)
11. [Monitoring va backup](#11-monitoring-va-backup)
12. [Troubleshooting](#12-troubleshooting)

---

## 1. Server talablari

| Resurs | Minimum | Tavsiya |
|--------|---------|---------|
| RAM | 2 GB | 4 GB |
| CPU | 2 core | 4 core |
| Disk | 40 GB SSD | 80 GB SSD |
| OS | Ubuntu 22.04+ / Debian 12+ | Ubuntu 24.04 |
| Network | 1 IPv4 | + IPv6 |

**Tavsiya etilgan provayderlar (UZ uchun):** DigitalOcean (Singapore), Hetzner (Germany), Yandex Cloud (Moskva), UzCloud.

---

## 2. Tashqi xizmatlar

Deploy boshlashdan oldin shu xizmatlarda hisob yarating va kalitlarni saqlang:

### 2.1 MongoDB (database)
- **Variant A** (oson): Docker Compose ichidagi MongoDB (`docker-compose.yml` ga kiritilgan)
- **Variant B** (tavsiya, production): [MongoDB Atlas](https://www.mongodb.com/atlas) - bepul tier yetadi boshlash uchun
- Cluster yarating, connection string oling: `mongodb+srv://user:pass@cluster.mongodb.net/property`

### 2.2 Object Storage (rasm/video)
- **DigitalOcean Spaces** yoki **AWS S3** yoki **Backblaze B2** (S3-compatible)
- Bucket yarating (masalan `amaar-property-uz`)
- Access Key va Secret oling
- CDN yoqing (DO Spaces CDN bepul)

### 2.3 SMS (faqat O'zbekiston uchun)
- [Eskiz.uz](https://eskiz.uz) - business hisob oching
- API ga kirish uchun ariza bering (1-2 kun)
- Approved SMS template'larini sozlang
- API URL, email, password, sender_id oling

### 2.4 OAuth provayderlar
- **Google**: [Google Cloud Console](https://console.cloud.google.com) - OAuth 2.0 Client ID yarating
- **Facebook** (ixtiyoriy): developers.facebook.com
- **Apple** (faqat iOS app uchun): developer.apple.com
- Callback URL'larni domeningiz bo'yicha sozlang

### 2.5 Payme (faqat O'zbekiston uchun)
- [business.payme.uz](https://business.payme.uz) - merchant hisob
- Avval **sandbox** (test) muhitida ishlang: `https://test.paycom.uz`
- Merchant ID + Secret Key oling
- Webhook URL: `https://api.amaar.uz/api/payme/webhook`

### 2.6 SMTP (email)
- Gmail, Mailgun, SendGrid yoki o'zingizning SMTP
- Gmail uchun App Password kerak (2FA yoqilgan bo'lsa)

---

## 3. Server tayyorlash

SSH orqali serverga ulaning va quyidagilarni o'rnating:

```bash
# Yangilash
sudo apt update && sudo apt upgrade -y

# Asosiy tool'lar
sudo apt install -y git curl ufw fail2ban

# Firewall
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# Docker + Docker Compose
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
newgrp docker

# Tekshirish
docker --version
docker compose version
```

---

## 4. Kodni clone qilish

```bash
cd /opt
sudo mkdir -p property && sudo chown $USER:$USER property
cd property

# Server
git clone https://github.com/tilav-web/property-server.git server
# yoki tashkilot repo:
# git clone https://github.com/system-ats/amaar-properties-backend.git server

# Frontend (alohida deploy uchun yoki bir xil serverda)
git clone https://github.com/tilav-web/property-client.git client
```

---

## 5. Backend `.env` to'ldirish

```bash
cd /opt/property/server
cp .env.example .env
nano .env
```

### MAJBURIY o'zgaruvchilar

```bash
# === Country/Currency ===
COUNTRY=UZ                          # UZ | MY
DEFAULT_CURRENCY=UZS                # COUNTRY=UZ bo'lsa avtomatik
DEFAULT_LANGUAGE=uz
SUPPORTED_LANGUAGES=uz,ru,en
DEFAULT_MAP_CENTER=41.2995,69.2401  # Toshkent
DEFAULT_MAP_ZOOM=12

# === Core ===
PORT=3000
NODE_ENV=production
CLIENT_URL=https://amaar.uz         # Frontend domen (CORS uchun)

# === JWT - tasodifiy 64+ belgili string yarating! ===
JWT_SECRET=<openssl rand -hex 32 natija>
ADMIN_JWT_SECRET=<openssl rand -hex 32 natija - JWT_SECRET dan boshqa!>

# === MongoDB ===
# Atlas:
MONGODB_URL=mongodb+srv://user:pass@cluster.mongodb.net/property
# Yoki Docker mongo:
# MONGODB_URL=mongodb://mongo:27017/property

# === DigitalOcean Spaces ===
DO_SPACES_ENDPOINT=https://sgp1.digitaloceanspaces.com
DO_SPACES_REGION=sgp1
DO_SPACES_BUCKET=amaar-property-uz
DO_SPACES_KEY=DO00...
DO_SPACES_SECRET=...
DO_SPACES_CDN_URL=https://amaar-property-uz.sgp1.cdn.digitaloceanspaces.com

# === Email ===
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USERNAME=noreply@amaar.uz
EMAIL_PASSWORD=<app-password>
DEFAULT_FROM=noreply@amaar.uz
```

### Country-specific

#### Uzbekistan
```bash
# SMS - Eskiz
SMS_PROVIDER=eskiz
ESKIZ_API_URL=https://notify.eskiz.uz/api
ESKIZ_EMAIL=<eskiz email>
ESKIZ_PASSWORD=<eskiz password>
ESKIZ_DEFAULT_FROM=4546
ESKIZ_TEST_MODE=0                   # production'da 0!

# Payme
PAYMENT_PROVIDER=payme
PAYME_MERCHANT_ID=<production merchant id>
PAYME_SECRET_KEY=<production secret>
PAYME_CHECKOUT_URL=https://checkout.paycom.uz
PAYME_TEST_MODE=0                   # production'da 0!
# PAYME_ALLOWED_IPS - bo'sh qoldiring (default Payme IP'lari)

# Premium narxi
PREMIUM_PRICE=50000
PREMIUM_DURATION_DAYS=30
ADVERTISE_DAILY_PRICE=20000
ADVERTISE_CURRENCY=UZS
```

#### Malaysia
```bash
SMS_PROVIDER=none                   # SMS yo'q
PAYMENT_PROVIDER=none               # To'lov yo'q (hozircha)
# ESKIZ_* va PAYME_* env'lar bo'sh
```

### OAuth (har ikkala mamlakat)

```bash
GOOGLE_CLIENT_ID=<google client id>
GOOGLE_CLIENT_SECRET=<google secret>
GOOGLE_CALLBACK_URL=https://api.amaar.uz/api/users/auth/google/callback

# Facebook va Apple - ixtiyoriy
```

---

## 6. Docker Compose bilan ishga tushirish

```bash
cd /opt/property/server

# Build va start
docker compose up -d --build

# Loglarni ko'rish
docker compose logs -f server

# Status
docker compose ps
```

**Boot loglarda quyidagini ko'rishingiz kerak:**
```
CountryConfig: UZ | currency=UZS | lang=uz | sms=eskiz
Nest application successfully started
Tizim ishga tushdi
```

**Healthcheck:**
```bash
curl http://localhost/health
# {"status":"ok","uptime":12.3,"country":"UZ","currency":"UZS",...}
```

---

## 7. Frontend deploy

Ikki variant:

### Variant A: Shu serverda (oddiyroq)

`client/.env.production` yarating:
```bash
VITE_API_URL=https://api.amaar.uz
VITE_GOOGLE_MAPS=<key>
VITE_YANDEX_MAP=<key>
VITE_GOOGLE_MAP_ID=<id>
VITE_COUNTRY=UZ
VITE_DEFAULT_CURRENCY=UZS
VITE_DEFAULT_LANGUAGE=uz
VITE_SUPPORTED_LANGUAGES=uz,ru,en
VITE_DEFAULT_MAP_CENTER=41.2995,69.2401
VITE_DEFAULT_MAP_ZOOM=12
VITE_PHONE_COUNTRY_CODE=+998
```

Build qiling va nginx static fayllarini xizmat qilsin:
```bash
cd /opt/property/client
docker build \
  --build-arg VITE_API_URL=https://api.amaar.uz \
  --build-arg VITE_GOOGLE_MAPS=<key> \
  --build-arg VITE_COUNTRY=UZ \
  --build-arg VITE_DEFAULT_CURRENCY=UZS \
  # ... boshqa build-arg'lar
  -t amaar-client:latest .

docker run -d --name amaar-web --restart unless-stopped \
  -p 8080:80 amaar-client:latest
```

Keyin asosiy nginx (host'da) ikkalasiga reverse proxy qiladi:
- `https://amaar.uz` -> `localhost:8080` (frontend)
- `https://api.amaar.uz` -> `localhost:80` (backend nginx)

### Variant B: Vercel/Netlify (tavsiya)

Frontend statik bo'lgani uchun Vercel'da deploy qilish oson:
1. github.com/tilav-web/property-client ni Vercel'ga ulang
2. Vercel'da ENV variables to'ldiring (yuqoridagi `VITE_*`)
3. Domen biriktiring: amaar.uz
4. Avtomatik HTTPS + CDN bepul

---

## 8. Domen va HTTPS

DNS'da quyidagi A yozuvlarini qo'shing:
- `amaar.uz` -> server IP (frontend uchun, agar Variant A bo'lsa)
- `api.amaar.uz` -> server IP (backend uchun)

### Let's Encrypt SSL

```bash
# Host'da certbot o'rnatish
sudo apt install -y certbot python3-certbot-nginx

# Docker nginx ichida emas, host nginx orqali certbot
# (yoki Docker volume orqali sertifikatlarni nginx konteynerga bering)

# Variant 1: host nginx + Docker port 80 -> 3000
sudo certbot --nginx -d api.amaar.uz -d amaar.uz

# Avtomatik yangilash
sudo systemctl enable certbot.timer
```

`nginx.conf`'da HTTPS bloki yoqilgach, Docker nginx'ni qayta yuklang:
```bash
docker compose restart nginx
```

---

## 9. Payme webhook sozlash

1. [business.payme.uz](https://business.payme.uz) ga kiring (Merchant Cabinet)
2. **Settings -> API** bo'limiga o'ting
3. **Webhook URL**: `https://api.amaar.uz/api/payme/webhook`
4. **Authorization type**: Basic
5. **Login**: `Paycom`
6. **Password**: sizning `PAYME_SECRET_KEY` qiymati

Test qilish (sandbox):
```bash
# ngrok orqali local'da
ngrok http 3000
# Olingan URL'ni sandbox webhook'iga qo'ying
```

Production webhook test: real to'lov qiling -> serverning loglarida `PerformTransaction OK` ko'rinishi kerak.

---

## 10. Birinchi admin yaratish

Backend hech qanday admin'siz ishga tushadi. Birinchi adminni MongoDB'ga to'g'ridan-to'g'ri yozish kerak:

```bash
# Docker container ichidan
docker exec -it property-mongo mongosh property

# Mongo shell ichida:
db.admins.insertOne({
  first_name: "Super",
  last_name: "Admin",
  email: "admin@amaar.uz",                // SUPER_ADMIN bo'lishi uchun
  password: "<bcrypt hash>",              // pastdagi skript bilan yarating
  createdAt: new Date(),
  updatedAt: new Date()
});
```

Bcrypt hash yaratish:
```bash
docker exec -it property-server node -e "console.log(require('bcrypt').hashSync('SizningParolingiz123!', 10))"
```

Login: `POST https://api.amaar.uz/admins/login` body: `{email, password}`.

**SUPER_ADMIN aniqlash:** server `.env` ga `ADMIN_EMAIL=admin@amaar.uz` qo'ying - shu email super admin bo'ladi (boshqa adminlarni yaratish/o'chirish huquqi).

---

## 11. Monitoring va backup

### MongoDB backup (cron)

```bash
# /etc/cron.daily/property-backup
#!/bin/bash
BACKUP_DIR=/var/backups/property
mkdir -p $BACKUP_DIR
docker exec property-mongo mongodump \
  --db property \
  --archive=/tmp/backup.gz --gzip
docker cp property-mongo:/tmp/backup.gz $BACKUP_DIR/$(date +%Y-%m-%d).gz

# 30 kundan eskilarni o'chirish
find $BACKUP_DIR -name "*.gz" -mtime +30 -delete
```

`sudo chmod +x /etc/cron.daily/property-backup`

### Loglarni kuzatish

```bash
docker compose logs -f --tail 100 server
docker compose logs -f --tail 100 nginx
```

### Uptime monitoring

Tashqi xizmat: [UptimeRobot](https://uptimerobot.com) (bepul) - `https://api.amaar.uz/health` ni har 5 daqiqada tekshirsin.

---

## 12. Troubleshooting

| Muammo | Yechim |
|--------|--------|
| `Socket.IO ulanmaydi` | `nginx.conf` da `/socket.io/` location WebSocket headers bilan to'g'rimi tekshiring |
| `MongoDB connection failed` | `MONGODB_URL` to'g'ri, Atlas IP whitelist'ga server IP qo'shilganmi |
| `Eskiz 401 Unauthorized` | ESKIZ_EMAIL/PASSWORD to'g'ri, hisob faollashganmi |
| `Payme webhook INSUFFICIENT_PRIVILEGES` | PAYME_SECRET_KEY to'g'ri, IP whitelist Payme IP'lari (default 185.234.113.1-15) |
| `OAuth callback xato` | Google Console'da callback URL aniq: `https://api.amaar.uz/api/users/auth/google/callback` |
| `Upload qilingan rasm chiqmaydi` | DigitalOcean Spaces ACL public-read, CDN_URL to'g'rimi tekshiring |
| `Container restart loop` | `docker compose logs server` - boot xatosini ko'ring, ko'pincha ENV yo'q |

### Kerakli birinchi tekshirish

```bash
# Healthcheck
curl -i http://localhost/health

# MongoDB ulanish
docker exec -it property-mongo mongosh --eval "db.adminCommand('ping')"

# Server log
docker compose logs --tail 50 server

# Nginx config sintaksisi
docker exec property-nginx nginx -t
```

---

## Yangilanishlar (deploy v2)

Yangi commit kelganda:

```bash
cd /opt/property/server
git pull
docker compose up -d --build server  # faqat server'ni qayta build
docker compose logs -f server
```

Frontend uchun:
```bash
cd /opt/property/client
git pull
docker build -t amaar-client:latest .
docker stop amaar-web && docker rm amaar-web
docker run -d --name amaar-web --restart unless-stopped \
  -p 8080:80 amaar-client:latest
```

---

## Xulosa - tezkor checklist

- [ ] Server tayyor (Docker o'rnatilgan)
- [ ] DNS A yozuvlari to'g'ri (amaar.uz, api.amaar.uz)
- [ ] MongoDB Atlas cluster yaratilgan
- [ ] DigitalOcean Spaces bucket + access key
- [ ] Eskiz hisob (UZ) yoki SMS_PROVIDER=none (MY)
- [ ] Payme Merchant Cabinet (UZ) yoki PAYMENT_PROVIDER=none (MY)
- [ ] Google OAuth Client ID + Secret + callback URL
- [ ] `.env` to'liq to'ldirilgan
- [ ] `docker compose up -d --build` muvaffaqiyatli
- [ ] `curl /health` -> 200 OK
- [ ] HTTPS SSL sozlangan (Certbot)
- [ ] Frontend deploy qilingan (Vercel yoki shu server)
- [ ] Birinchi admin yaratilgan
- [ ] Payme webhook URL kiritilgan
- [ ] Test to'lov muvaffaqiyatli o'tdi
- [ ] MongoDB backup cron sozlangan
- [ ] UptimeRobot monitoring qo'shilgan

Hammasi tugagach, loyiha **production'da to'liq ishlaydi**.
