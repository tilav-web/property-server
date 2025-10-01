# ---- 1-bosqich: Quruvchi (Builder) ----
# Bu bosqichda kodni qurish (build) uchun kerakli barcha narsalar o'rnatiladi
FROM node:20-alpine AS builder
WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---- 2-bosqich: Ishga tushirish (Production) ----
# Bu bosqichda faqat tayyor ilovani ishga tushirish uchun kerakli narsalar qoladi
FROM node:20-alpine
WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci --omit=dev

# Quruvchi bosqichidan faqat tayyor "dist" papkasini nusxalaymiz
COPY --from=builder /usr/src/app/dist ./dist

# Konteyner ishga tushganda ilovani ishga tushiradigan buyruq
CMD ["node", "dist/main"]
