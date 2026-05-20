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

## 6. Backend - Docker Compose

Faqat **server + MongoDB** Docker'da. Nginx host'da (alohida).

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

**Healthcheck (server `127.0.0.1:3000`'da):**
```bash
curl http://127.0.0.1:3000/health
# {"status":"ok","uptime":12.3,"country":"UZ","currency":"UZS",...}
```

Server faqat `127.0.0.1:3000` ga ochiladi - tashqaridan to'g'ridan-to'g'ri kira olmaydi, faqat nginx orqali.

---

## 7. Frontend - statik build

Client Docker'siz, oddiy statik fayl sifatida deploy qilinadi.

### 7.1 Build qilish

```bash
cd /opt/property/client
cp .env.example .env

# .env ni to'ldiring (VITE_* o'zgaruvchilar)
nano .env
```

`.env` mazmuni:
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

Node.js o'rnating va build qiling:
```bash
# Node 20+ kerak
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

cd /opt/property/client
npm ci
npm run build
# dist/ papkasida static fayllar paydo bo'ladi
```

### 7.2 Static fayllarni nginx katalogiga ko'chirish

```bash
sudo mkdir -p /var/www/amaar-client
sudo cp -r dist/* /var/www/amaar-client/
sudo chown -R www-data:www-data /var/www/amaar-client
```

### 7.3 Alternativa - Vercel/Netlify

Agar host'da static serve qilish istamasangiz, frontend uchun:
1. github.com/tilav-web/property-client ni Vercel'ga ulang
2. Vercel'da ENV variables to'ldiring (yuqoridagi `VITE_*`)
3. Domen biriktiring: amaar.uz
4. Avtomatik HTTPS + CDN bepul

Bu holatda nginx config'idagi frontend `server` blokini olib tashlang (faqat backend qoladi).

---

## 8. Nginx (host) + HTTPS

DNS'da quyidagi A yozuvlarini qo'shing:
- `amaar.uz` -> server IP
- `www.amaar.uz` -> server IP
- `api.amaar.uz` -> server IP

### 8.1 Nginx config ko'chirish

```bash
sudo apt install -y nginx

# Loyihadan config faylni ko'chiring
sudo cp /opt/property/server/docs/nginx-amaar.conf /etc/nginx/sites-available/amaar.conf
sudo ln -sf /etc/nginx/sites-available/amaar.conf /etc/nginx/sites-enabled/

# Default site'ni o'chirish (agar bor bo'lsa)
sudo rm -f /etc/nginx/sites-enabled/default

# Sintaksis tekshirish
sudo nginx -t

# Qayta yuklash
sudo systemctl reload nginx
```

Tekshirish:
- `http://amaar.uz` -> frontend ko'rinishi kerak
- `http://api.amaar.uz/health` -> JSON javob
- `http://api.amaar.uz/uploads/<biror-rasm>` -> nginx static beradi

### 8.2 Let's Encrypt SSL

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d amaar.uz -d www.amaar.uz -d api.amaar.uz

# Avtomatik yangilash (90 kunda 1 marta)
sudo systemctl enable certbot.timer
```

Certbot:
- HTTPS server bloklarini avtomatik qo'shadi
- HTTP -> HTTPS redirect qo'shadi
- Sertifikat avtomatik yangilanadi

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
npm ci
npm run build
sudo rm -rf /var/www/amaar-client/*
sudo cp -r dist/* /var/www/amaar-client/
sudo chown -R www-data:www-data /var/www/amaar-client
# Nginx restart shart emas - static fayllar (browser cache faqat index.html'da yo'q)
```

Nginx config o'zgartirilgan bo'lsa:
```bash
sudo cp /opt/property/server/docs/nginx-amaar.conf /etc/nginx/sites-available/amaar.conf
sudo nginx -t && sudo systemctl reload nginx
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
