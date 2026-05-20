#!/bin/bash
# ============================================================================
# Uzbekistan (uybos.uz) - to'liq deploy skripti
# ----------------------------------------------------------------------------
# Bu skriptni serverda root sifatida ishga tushiring:
#   bash deploy-uz.sh
#
# Skript quyidagilarni qiladi:
# 1. Tizim paketlarini o'rnatish (docker, nginx, certbot, node)
# 2. Frontend build (npm ci + npm run build) -> /var/www/uybos-client
# 3. Nginx config sozlash + ulanish
# 4. Docker compose (server + mongo) ishga tushirish
#
# OLDINDAN BAJARING:
#   1. git clone server va client'ni /home/property/ ga
#   2. /home/property/server/.env to'ldiring (.env.uz.example asosida)
#   3. /home/property/client/.env to'ldiring (.env.uz.client.example asosida)
#   4. DNS yozuvlari sozlangan: uybos.uz, www.uybos.uz, api.uybos.uz -> server IP
# ============================================================================

set -e  # xato bo'lsa to'xtash

PROJECT_DIR="/home/property"
SERVER_DIR="$PROJECT_DIR/server"
CLIENT_DIR="$PROJECT_DIR/client"
WEB_ROOT="/var/www/uybos-client"
DOMAIN_FRONT="uybos.uz"
DOMAIN_API="api.uybos.uz"

echo "═══════════════════════════════════════════════════════════════"
echo "  Uzbekistan (uybos.uz) deploy boshlandi"
echo "═══════════════════════════════════════════════════════════════"

# ---------------------------------------------------------------------------
# 0. Tekshirish
# ---------------------------------------------------------------------------
if [ ! -d "$SERVER_DIR" ] || [ ! -d "$CLIENT_DIR" ]; then
    echo "❌ $PROJECT_DIR/{server,client} topilmadi. Avval git clone qiling."
    exit 1
fi
if [ ! -f "$SERVER_DIR/.env" ]; then
    echo "❌ $SERVER_DIR/.env yo'q. .env.uz.example asosida yarating."
    exit 1
fi
if [ ! -f "$CLIENT_DIR/.env" ]; then
    echo "❌ $CLIENT_DIR/.env yo'q. .env.uz.client.example asosida yarating."
    exit 1
fi

# ---------------------------------------------------------------------------
# 1. Tizim paketlarini o'rnatish
# ---------------------------------------------------------------------------
echo ""
echo "▶ 1/5: Tizim paketlarini o'rnatish..."
apt update -y
apt install -y curl ufw fail2ban nginx

# Docker
if ! command -v docker &> /dev/null; then
    echo "   Docker o'rnatilmoqda..."
    curl -fsSL https://get.docker.com | sh
fi

# Node.js 20
if ! command -v node &> /dev/null || [ "$(node -v | cut -d. -f1 | tr -d v)" -lt 20 ]; then
    echo "   Node.js 20 o'rnatilmoqda..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
fi

# Certbot
apt install -y certbot python3-certbot-nginx

# Firewall
ufw allow OpenSSH 2>/dev/null || true
ufw allow 80/tcp 2>/dev/null || true
ufw allow 443/tcp 2>/dev/null || true
yes | ufw enable || true

# ---------------------------------------------------------------------------
# 2. Frontend build
# ---------------------------------------------------------------------------
echo ""
echo "▶ 2/5: Frontend build..."
cd "$CLIENT_DIR"
npm ci
npm run build

mkdir -p "$WEB_ROOT"
rm -rf "$WEB_ROOT"/*
cp -r dist/* "$WEB_ROOT/"
chown -R www-data:www-data "$WEB_ROOT"
echo "   ✓ Frontend $WEB_ROOT ga ko'chirildi"

# ---------------------------------------------------------------------------
# 3. Nginx config
# ---------------------------------------------------------------------------
echo ""
echo "▶ 3/5: Nginx sozlash..."
cp "$SERVER_DIR/docs/nginx-uybos.conf" /etc/nginx/sites-available/uybos.conf
ln -sf /etc/nginx/sites-available/uybos.conf /etc/nginx/sites-enabled/uybos.conf
rm -f /etc/nginx/sites-enabled/default

nginx -t
systemctl reload nginx
echo "   ✓ Nginx config yuklandi"

# ---------------------------------------------------------------------------
# 4. Docker compose (server + mongo)
# ---------------------------------------------------------------------------
echo ""
echo "▶ 4/5: Backend Docker compose..."
cd "$SERVER_DIR"
mkdir -p uploads
chown -R 1000:1000 uploads

docker compose down 2>/dev/null || true
docker compose up -d --build

echo "   ✓ Server konteyner ishga tushdi"
echo "   Loglarni tekshirish: docker compose logs -f server"

# ---------------------------------------------------------------------------
# 5. SSL (Let's Encrypt)
# ---------------------------------------------------------------------------
echo ""
echo "▶ 5/5: SSL sertifikat..."
echo "   DNS yozuvlari to'g'rimi tekshiring:"
echo "   - $DOMAIN_FRONT       -> $(curl -s ifconfig.me)"
echo "   - www.$DOMAIN_FRONT   -> $(curl -s ifconfig.me)"
echo "   - $DOMAIN_API         -> $(curl -s ifconfig.me)"
echo ""
read -p "DNS to'g'ri sozlangan? Certbot ishlatish (y/N): " confirm
if [[ $confirm =~ ^[Yy]$ ]]; then
    certbot --nginx -d "$DOMAIN_FRONT" -d "www.$DOMAIN_FRONT" -d "$DOMAIN_API" \
        --non-interactive --agree-tos -m "admin@$DOMAIN_FRONT" || \
        echo "   ⚠ Certbot xato qaytardi - keyin qo'lda sinab ko'ring"
    systemctl enable certbot.timer
else
    echo "   ⚠ SSL keyin sozlanadi: certbot --nginx -d $DOMAIN_FRONT -d www.$DOMAIN_FRONT -d $DOMAIN_API"
fi

# ---------------------------------------------------------------------------
# Yakuniy tekshirish
# ---------------------------------------------------------------------------
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  Deploy tugadi"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "Healthcheck:"
sleep 5
curl -s "http://127.0.0.1:3000/health" || echo "   ⚠ Server hali ishga tushmagan"
echo ""
echo ""
echo "Tekshirish (browser):"
echo "  Frontend:    https://$DOMAIN_FRONT"
echo "  API health:  https://$DOMAIN_API/health"
echo "  Swagger:     https://$DOMAIN_API/api/docs"
echo ""
echo "Birinchi admin (ADMIN_EMAIL + ADMIN_PASSWORD .env'dan):"
echo "  POST https://$DOMAIN_API/admins/login"
echo "  Body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD }"
echo ""
echo "Loglarni ko'rish:"
echo "  docker compose -f $SERVER_DIR/docker-compose.yml logs -f server"
echo "  tail -f /var/log/nginx/uybos-api-error.log"
