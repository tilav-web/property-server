# Amaar Properties — Backend

Malayziya ko'chmas mulk bozori uchun ko'p tilli (uz / ru / en / ms) platforma backend qismi. NestJS asosida qurilgan REST API: foydalanuvchilar, e'lonlar, qidiruv, AI orqali tabiiy tildagi qidiruv, real-time chat, bildirishnomalar va admin panel uchun xizmatlar.

## Texnologiyalar

- **Framework:** NestJS 11 (Node.js, TypeScript)
- **MA'lumotlar bazasi:** MongoDB (Mongoose)
- **Autentifikatsiya:** JWT + OAuth (Google, Facebook, Apple) + alohida admin JWT
- **Real-time:** Socket.IO (chat va bildirishnomalar)
- **AI:** OpenAI (tabiiy tildagi qidiruvni tuzilgan filterga aylantirish)
- **Fayl saqlash:** AWS S3, Sharp (rasmlarni qayta ishlash)
- **Email:** Nodemailer + Handlebars shablonlari

## Loyihani ishga tushirish

```bash
# 1. Bog'liqliklarni o'rnatish
npm install

# 2. .env faylini sozlash (MongoDB URI, JWT secret, OAuth, AWS S3, OpenAI, SMTP)

# 3. Development rejimda ishga tushirish
npm run start:dev

# 4. Production build
npm run build
npm run start:prod
```

## Foydali skriptlar

```bash
npm run lint          # ESLint tekshiruvi
npm run format        # Prettier formatlash
npm run test          # Unit testlar
npm run seed:all      # Boshlang'ich ma'lumotlarni yuklash
```

---

**Tilovov Shavqiddin**
