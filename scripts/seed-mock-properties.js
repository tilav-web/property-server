/**
 * Mock Properties Seed Script
 * Bazaga test uchun 15 ta mock property qo'shadi.
 * Mavjud user/seller larni ishlatadi, agar yo'q bo'lsa yangilarini yaratadi.
 *
 * Foydalanish:
 *   node scripts/seed-mock-properties.js
 *   node scripts/seed-mock-properties.js --dry-run   (faqat ko'rish)
 *   node scripts/seed-mock-properties.js --clean     (oldin qo'shilganlarni o'chiradi)
 */

require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');
const crypto = require('crypto');

const DRY_RUN = process.argv.includes('--dry-run');
const CLEAN = process.argv.includes('--clean');
const SEED_TAG = 'MOCK_SEED_v1';

// ─── ENUMS ────────────────────────────────────────────────────────────────────
const CATEGORIES = {
  SALE: 'APARTMENT_SALE',
  RENT: 'APARTMENT_RENT',
};

const STATUS = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
};

const REPAIR = { NEW: 'NEW', RENOVATED: 'RENOVATED', OLD: 'OLD' };
const HEATING = { CENTRAL: 'CENTRAL', INDIVIDUAL: 'INDIVIDUAL', NONE: 'NONE' };
const AMENITIES = ['pool', 'balcony', 'security', 'air_conditioning', 'parking', 'elevator'];

// ─── TOSHKENT KOORDINATALARI ──────────────────────────────────────────────────
const LOCATIONS = [
  { name: 'Chilanzar', lng: 69.2146, lat: 41.2756 },
  { name: 'Yunusabad',  lng: 69.2786, lat: 41.3540 },
  { name: 'Mirabad',    lng: 69.2825, lat: 41.3094 },
  { name: 'Uchtepa',    lng: 69.1823, lat: 41.2861 },
  { name: 'Sergeli',    lng: 69.2014, lat: 41.2278 },
  { name: 'Shayxontohur', lng: 69.2263, lat: 41.3186 },
  { name: 'Yakkasaroy', lng: 69.2601, lat: 41.2878 },
  { name: 'Olmazar',    lng: 69.3045, lat: 41.3412 },
  { name: 'Hamza',      lng: 69.3156, lat: 41.2934 },
  { name: 'Bektemir',   lng: 69.3587, lat: 41.2612 },
];

// ─── PHOTO URL lar (Unsplash jamoatchi rasmlar) ───────────────────────────────
const PHOTO_SETS = [
  [
    'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800',
    'https://images.unsplash.com/photo-1560449752-3fd4bdbe3aee?w=800',
  ],
  [
    'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800',
    'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800',
  ],
  [
    'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800',
    'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800',
  ],
  [
    'https://images.unsplash.com/photo-1536376072261-38c75010e6c9?w=800',
    'https://images.unsplash.com/photo-1554995207-c18c203602cb?w=800',
  ],
  [
    'https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?w=800',
    'https://images.unsplash.com/photo-1630699144867-37acec97df5a?w=800',
  ],
];

// ─── MOCK PROPERTY MA'LUMOTLARI ───────────────────────────────────────────────
const MOCK_PROPERTIES = [
  {
    titleUz: '3 xonali kvartira Chilanzarda',
    titleRu: '3-комнатная квартира в Чиланзаре',
    titleEn: '3-bedroom apartment in Chilanzar',
    descUz: 'Chilanzar 1 kvartalda joylashgan qulay 3 xonali kvartira. Yangi ta\'mir, mebel bilan.',
    descRu: 'Удобная 3-комнатная квартира в 1 квартале Чиланзара. Новый ремонт, с мебелью.',
    descEn: 'Comfortable 3-bedroom apartment in Chilanzar block 1. New renovation, furnished.',
    addrUz: 'Toshkent, Chilanzar tumani, 1-kvartal',
    addrRu: 'Ташкент, Чиланзарский район, 1 квартал',
    addrEn: 'Tashkent, Chilanzar district, Block 1',
    category: CATEGORIES.SALE,
    price: 65000,
    currency: 'USD',
    locationIdx: 0,
    bedrooms: 3, bathrooms: 1, floor_level: 5, total_floors: 9,
    area: 68, furnished: true,
    repair_type: REPAIR.RENOVATED, heating: HEATING.CENTRAL,
    amenities: ['balcony', 'elevator', 'security'],
    mortgage_available: true,
    is_premium: true,
  },
  {
    titleUz: '2 xonali kvartira Yunusabodda',
    titleRu: '2-комнатная квартира в Юнусабаде',
    titleEn: '2-bedroom apartment in Yunusabad',
    descUz: 'Yunusabad 10-kvartalda yangi qurilma, 2 xonali zamonaviy kvartira.',
    descRu: 'Новостройка в 10 квартале Юнусабада, современная 2-комнатная квартира.',
    descEn: 'New building in Yunusabad block 10, modern 2-bedroom apartment.',
    addrUz: 'Toshkent, Yunusobod tumani, 10-kvartal',
    addrRu: 'Ташкент, Юнусабадский район, 10 квартал',
    addrEn: 'Tashkent, Yunusabad district, Block 10',
    category: CATEGORIES.SALE,
    price: 95000,
    currency: 'USD',
    locationIdx: 1,
    bedrooms: 2, bathrooms: 1, floor_level: 8, total_floors: 16,
    area: 55, furnished: false,
    repair_type: REPAIR.NEW, heating: HEATING.CENTRAL,
    amenities: ['elevator', 'parking', 'security'],
    mortgage_available: true,
    is_premium: false,
  },
  {
    titleUz: '1 xonali kvartira ijaraga Mirabodda',
    titleRu: '1-комнатная квартира в аренду в Мирабаде',
    titleEn: '1-bedroom apartment for rent in Mirabad',
    descUz: 'Mirabad ko\'chasida 1 xonali kvartira ijaraga beriladi. Barcha qulayliklar mavjud.',
    descRu: 'Сдаётся 1-комнатная квартира на улице Мирабад. Все удобства.',
    descEn: 'Renting 1-bedroom apartment on Mirabad street. All amenities included.',
    addrUz: 'Toshkent, Mirabad tumani, Mirabad ko\'chasi',
    addrRu: 'Ташкент, Мирабадский район, улица Мирабад',
    addrEn: 'Tashkent, Mirabad district, Mirabad street',
    category: CATEGORIES.RENT,
    price: 600,
    currency: 'USD',
    locationIdx: 2,
    bedrooms: 1, bathrooms: 1, floor_level: 3, total_floors: 5,
    area: 38, furnished: true,
    repair_type: REPAIR.RENOVATED, heating: HEATING.CENTRAL,
    amenities: ['air_conditioning', 'balcony'],
    contract_duration_months: 12,
    rental_target: ['any'],
    is_premium: false,
  },
  {
    titleUz: '4 xonali uy Uchtepa tumani',
    titleRu: '4-комнатная квартира в Учтепе',
    titleEn: '4-room apartment in Uchtepa',
    descUz: 'Uchtepa tumanida keng 4 xonali kvartira. Hovli va parking bilan.',
    descRu: 'Просторная 4-комнатная квартира в Учтепе. С двором и парковкой.',
    descEn: 'Spacious 4-room apartment in Uchtepa. With yard and parking.',
    addrUz: 'Toshkent, Uchtepa tumani',
    addrRu: 'Ташкент, Учтепинский район',
    addrEn: 'Tashkent, Uchtepa district',
    category: CATEGORIES.SALE,
    price: 120000,
    currency: 'USD',
    locationIdx: 3,
    bedrooms: 4, bathrooms: 2, floor_level: 2, total_floors: 5,
    area: 110, furnished: false,
    repair_type: REPAIR.OLD, heating: HEATING.CENTRAL,
    amenities: ['parking', 'balcony'],
    mortgage_available: false,
    is_premium: false,
  },
  {
    titleUz: '2 xonali kvartira ijaraga Sergeli',
    titleRu: '2-комнатная квартира в аренду в Сергели',
    titleEn: '2-bedroom apartment for rent in Sergeli',
    descUz: 'Sergeli MFY yaqinida yangi ta\'mirli 2 xonali kvartira. Oilaviy ijaraga beriladi.',
    descRu: 'Квартира с новым ремонтом рядом с МФЙ Сергели. Сдаётся для семей.',
    descEn: 'Newly renovated apartment near Sergeli MFY. For family rent.',
    addrUz: 'Toshkent, Sergeli tumani, MFY yaqini',
    addrRu: 'Ташкент, Сергелийский район, рядом с МФЙ',
    addrEn: 'Tashkent, Sergeli district, near MFY',
    category: CATEGORIES.RENT,
    price: 450,
    currency: 'USD',
    locationIdx: 4,
    bedrooms: 2, bathrooms: 1, floor_level: 4, total_floors: 9,
    area: 52, furnished: true,
    repair_type: REPAIR.NEW, heating: HEATING.CENTRAL,
    amenities: ['air_conditioning', 'elevator', 'balcony'],
    contract_duration_months: 6,
    rental_target: ['family'],
    is_premium: true,
  },
  {
    titleUz: '3 xonali kvartira Shayxontohurda',
    titleRu: '3-комнатная квартира в Шайхантахуре',
    titleEn: '3-bedroom apartment in Shaykhantakhur',
    descUz: 'Shayxontohur markazida 3 xonali kvartira. Metro yaqini, qulay joylashuv.',
    descRu: '3-комнатная квартира в центре Шайхантахура. Рядом метро, удобное расположение.',
    descEn: '3-bedroom apartment in Shaykhantakhur center. Near metro, convenient location.',
    addrUz: 'Toshkent, Shayxontohur tumani, markaziy ko\'cha',
    addrRu: 'Ташкент, Шайхантахурский район, центральная улица',
    addrEn: 'Tashkent, Shaykhantakhur district, central street',
    category: CATEGORIES.SALE,
    price: 85000,
    currency: 'USD',
    locationIdx: 5,
    bedrooms: 3, bathrooms: 1, floor_level: 6, total_floors: 12,
    area: 75, furnished: false,
    repair_type: REPAIR.RENOVATED, heating: HEATING.CENTRAL,
    amenities: ['elevator', 'balcony', 'security'],
    mortgage_available: true,
    is_premium: false,
  },
  {
    titleUz: '1 xonali studio Yakkasaroy',
    titleRu: 'Студия в Яккасарае',
    titleEn: 'Studio apartment in Yakkasaray',
    descUz: 'Yakkasaroy tumanida zamonaviy studio kvartira ijaraga beriladi. Talabalar uchun qulay.',
    descRu: 'Современная студия в Яккасарае сдаётся. Удобно для студентов.',
    descEn: 'Modern studio in Yakkasaray for rent. Convenient for students.',
    addrUz: 'Toshkent, Yakkasaroy tumani',
    addrRu: 'Ташкент, Яккасарайский район',
    addrEn: 'Tashkent, Yakkasaray district',
    category: CATEGORIES.RENT,
    price: 350,
    currency: 'USD',
    locationIdx: 6,
    bedrooms: 1, bathrooms: 1, floor_level: 7, total_floors: 14,
    area: 30, furnished: true,
    repair_type: REPAIR.NEW, heating: HEATING.INDIVIDUAL,
    amenities: ['air_conditioning', 'elevator'],
    contract_duration_months: 1,
    rental_target: ['students', 'girls'],
    is_premium: false,
  },
  {
    titleUz: '5 xonali uy Olmazar',
    titleRu: '5-комнатный дом в Алмазаре',
    titleEn: '5-room house in Olmazar',
    descUz: 'Olmazar tumanida katta 5 xonali uy sotiladi. Katta hovli, garaj bilan.',
    descRu: 'Большой 5-комнатный дом в Алмазаре. С большим двором и гаражом.',
    descEn: 'Large 5-room house for sale in Olmazar. With big yard and garage.',
    addrUz: 'Toshkent, Olmazar tumani',
    addrRu: 'Ташкент, Алмазарский район',
    addrEn: 'Tashkent, Olmazar district',
    category: CATEGORIES.SALE,
    price: 185000,
    currency: 'USD',
    locationIdx: 7,
    bedrooms: 5, bathrooms: 2, floor_level: 1, total_floors: 2,
    area: 200, furnished: false,
    repair_type: REPAIR.RENOVATED, heating: HEATING.INDIVIDUAL,
    amenities: ['parking', 'security', 'balcony'],
    mortgage_available: false,
    is_premium: true,
  },
  {
    titleUz: '2 xonali yangi bino Hamza',
    titleRu: '2-комнатная квартира в новостройке, Хамза',
    titleEn: '2-bedroom new building apartment, Hamza',
    descUz: 'Hamza tumanidagi yangi binoda 2 xonali kvartira. Hali ta\'mirsiz, arzon narxda.',
    descRu: '2-комнатная квартира в новом доме в Хамзе. Без ремонта, по низкой цене.',
    descEn: '2-bedroom apartment in new building in Hamza. No renovation, low price.',
    addrUz: 'Toshkent, Hamza tumani, yangi bino',
    addrRu: 'Ташкент, Хамзинский район, новостройка',
    addrEn: 'Tashkent, Hamza district, new building',
    category: CATEGORIES.SALE,
    price: 48000,
    currency: 'USD',
    locationIdx: 8,
    bedrooms: 2, bathrooms: 1, floor_level: 3, total_floors: 16,
    area: 58, furnished: false,
    repair_type: REPAIR.OLD, heating: HEATING.CENTRAL,
    amenities: ['elevator', 'parking'],
    mortgage_available: true,
    is_premium: false,
  },
  {
    titleUz: '3 xonali kvartira ijaraga Bektemir',
    titleRu: '3-комнатная квартира в аренду, Бектемир',
    titleEn: '3-bedroom apartment for rent, Bektemir',
    descUz: 'Bektemir tumanida qulay 3 xonali kvartira. Oilaviy yashash uchun ideal.',
    descRu: 'Удобная 3-комнатная квартира в Бектемире. Идеально для семьи.',
    descEn: 'Comfortable 3-bedroom apartment in Bektemir. Ideal for family.',
    addrUz: 'Toshkent, Bektemir tumani',
    addrRu: 'Ташкент, Бектемирский район',
    addrEn: 'Tashkent, Bektemir district',
    category: CATEGORIES.RENT,
    price: 500,
    currency: 'USD',
    locationIdx: 9,
    bedrooms: 3, bathrooms: 1, floor_level: 2, total_floors: 5,
    area: 72, furnished: true,
    repair_type: REPAIR.RENOVATED, heating: HEATING.CENTRAL,
    amenities: ['balcony', 'parking'],
    contract_duration_months: 12,
    rental_target: ['family'],
    is_premium: false,
  },
  {
    titleUz: 'Premium 4 xonali Yunusabod',
    titleRu: 'Премиум 4-комнатная в Юнусабаде',
    titleEn: 'Premium 4-bedroom in Yunusabad',
    descUz: 'Yunusabad 19-kvartalda hashamatli 4 xonali kvartira. Havza, lift, xavfsizlik.',
    descRu: 'Роскошная 4-комнатная квартира в 19 квартале Юнусабада. Бассейн, лифт, охрана.',
    descEn: 'Luxury 4-bedroom apartment in Yunusabad block 19. Pool, elevator, security.',
    addrUz: 'Toshkent, Yunusobod tumani, 19-kvartal',
    addrRu: 'Ташкент, Юнусабадский район, 19 квартал',
    addrEn: 'Tashkent, Yunusabad district, Block 19',
    category: CATEGORIES.SALE,
    price: 210000,
    currency: 'USD',
    locationIdx: 1,
    bedrooms: 4, bathrooms: 2, floor_level: 10, total_floors: 20,
    area: 130, furnished: true,
    repair_type: REPAIR.NEW, heating: HEATING.CENTRAL,
    amenities: ['pool', 'elevator', 'security', 'parking', 'air_conditioning', 'balcony'],
    mortgage_available: true,
    is_premium: true,
  },
  {
    titleUz: '1 xonali kvartira ijaraga Chilanzar',
    titleRu: '1-комнатная квартира в аренду, Чиланзар',
    titleEn: '1-bedroom for rent, Chilanzar',
    descUz: 'Chilanzar 6-kvartalda 1 xonali kvartira ijaraga. Uy-joy narxi mos.',
    descRu: 'Сдаётся 1-комнатная квартира в 6 квартале Чиланзара. Цена приемлемая.',
    descEn: '1-bedroom apartment for rent in Chilanzar block 6. Reasonable price.',
    addrUz: 'Toshkent, Chilanzar tumani, 6-kvartal',
    addrRu: 'Ташкент, Чиланзарский район, 6 квартал',
    addrEn: 'Tashkent, Chilanzar district, Block 6',
    category: CATEGORIES.RENT,
    price: 300,
    currency: 'USD',
    locationIdx: 0,
    bedrooms: 1, bathrooms: 1, floor_level: 1, total_floors: 5,
    area: 36, furnished: false,
    repair_type: REPAIR.OLD, heating: HEATING.CENTRAL,
    amenities: [],
    contract_duration_months: 6,
    rental_target: ['any'],
    is_premium: false,
  },
  {
    titleUz: '3 xonali UZS narxida Mirabad',
    titleRu: '3-комнатная в сумах, Мирабад',
    titleEn: '3-bedroom priced in UZS, Mirabad',
    descUz: 'Mirabad tumanida 3 xonali kvartira so\'mga sotiladi. Metro yaqinida.',
    descRu: '3-комнатная квартира в Мирабаде продаётся в сумах. Рядом метро.',
    descEn: '3-bedroom in Mirabad priced in UZS. Near metro station.',
    addrUz: 'Toshkent, Mirabad tumani, metro yaqini',
    addrRu: 'Ташкент, Мирабадский район, у метро',
    addrEn: 'Tashkent, Mirabad, near metro',
    category: CATEGORIES.SALE,
    price: 780000000,
    currency: 'UZS',
    locationIdx: 2,
    bedrooms: 3, bathrooms: 1, floor_level: 4, total_floors: 9,
    area: 78, furnished: false,
    repair_type: REPAIR.RENOVATED, heating: HEATING.CENTRAL,
    amenities: ['elevator', 'balcony'],
    mortgage_available: true,
    is_premium: false,
  },
  {
    titleUz: '2 xonali eski shahar markazi',
    titleRu: '2-комнатная в старом центре',
    titleEn: '2-bedroom in old city center',
    descUz: 'Shahar markazida, tarixiy binoda 2 xonali kvartira. Noyob joylashuv.',
    descRu: '2-комнатная квартира в историческом здании в центре города. Уникальное расположение.',
    descEn: '2-bedroom in a historical building in the city center. Unique location.',
    addrUz: 'Toshkent, Shayxontohur, eski shahar markazi',
    addrRu: 'Ташкент, Шайхантахур, старый центр',
    addrEn: 'Tashkent, Shaykhantakhur, old city center',
    category: CATEGORIES.SALE,
    price: 72000,
    currency: 'USD',
    locationIdx: 5,
    bedrooms: 2, bathrooms: 1, floor_level: 2, total_floors: 4,
    area: 60, furnished: false,
    repair_type: REPAIR.OLD, heating: HEATING.CENTRAL,
    amenities: ['balcony'],
    mortgage_available: false,
    is_premium: false,
  },
  {
    titleUz: 'Premium ijara Yunusabod havza bilan',
    titleRu: 'Премиум аренда с бассейном, Юнусабад',
    titleEn: 'Premium rental with pool, Yunusabad',
    descUz: 'Yunusabodda hashamatli 3 xonali kvartira ijaraga. Havza, 24/7 xavfsizlik.',
    descRu: 'Роскошная 3-комнатная квартира в аренду в Юнусабаде. Бассейн, охрана 24/7.',
    descEn: 'Luxury 3-bedroom for rent in Yunusabad. Pool, 24/7 security.',
    addrUz: 'Toshkent, Yunusobod tumani, elita majmuasi',
    addrRu: 'Ташкент, Юнусабад, элитный комплекс',
    addrEn: 'Tashkent, Yunusabad, elite complex',
    category: CATEGORIES.RENT,
    price: 1500,
    currency: 'USD',
    locationIdx: 1,
    bedrooms: 3, bathrooms: 2, floor_level: 12, total_floors: 20,
    area: 100, furnished: true,
    repair_type: REPAIR.NEW, heating: HEATING.INDIVIDUAL,
    amenities: ['pool', 'elevator', 'security', 'air_conditioning', 'balcony', 'parking'],
    contract_duration_months: 12,
    rental_target: ['family'],
    is_premium: true,
  },
];

// ─── HELPER ───────────────────────────────────────────────────────────────────
function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function buildProperty(data, authorId, photoSet) {
  const loc = LOCATIONS[data.locationIdx];
  const isRent = data.category === CATEGORIES.RENT;

  const base = {
    author: authorId,
    title: { uz: data.titleUz, ru: data.titleRu, en: data.titleEn, ms: data.titleEn },
    description: { uz: data.descUz, ru: data.descRu, en: data.descEn, ms: data.descEn },
    address: { uz: data.addrUz, ru: data.addrRu, en: data.addrEn, ms: data.addrEn },
    category: data.category,
    location: { type: 'Point', coordinates: [loc.lng, loc.lat] },
    currency: data.currency,
    price: data.price,
    is_premium: data.is_premium || false,
    is_premium_until: data.is_premium ? new Date(Date.now() + 30 * 24 * 3600 * 1000) : null,
    status: 'APPROVED',
    is_archived: false,
    rating: parseFloat((Math.random() * 2 + 3).toFixed(1)),
    liked: Math.floor(Math.random() * 50),
    saved: Math.floor(Math.random() * 30),
    photos: photoSet,
    videos: [],
    // discriminator fields
    bedrooms: data.bedrooms,
    bathrooms: data.bathrooms,
    floor_level: data.floor_level,
    total_floors: data.total_floors,
    area: data.area,
    furnished: data.furnished,
    repair_type: data.repair_type,
    heating: data.heating,
    amenities: data.amenities || [],
    _seed_tag: SEED_TAG,
    createdAt: new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 3600 * 1000),
    updatedAt: new Date(),
  };

  if (isRent) {
    base.contract_duration_months = data.contract_duration_months || 12;
    base.rental_target = data.rental_target || ['any'];
  } else {
    base.mortgage_available = data.mortgage_available || false;
  }

  return base;
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {
  const uri = process.env.MONGODB_URL;
  if (!uri) {
    console.error('❌ MONGODB_URL topilmadi');
    process.exit(1);
  }

  console.log(`\n${DRY_RUN ? '🔍 DRY RUN' : '🚀 WRITE MODE'} — MongoDB ga ulanilmoqda...`);
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db();

    const usersCol      = db.collection('users');
    const sellersCol    = db.collection('sellers');
    const propertiesCol = db.collection('properties');
    const physicalCol   = db.collection('physicalsellers');

    // ── 0. --clean: oldin qo'shilganlarni o'chirish ──────────────────────────
    if (CLEAN && !DRY_RUN) {
      const deleted = await propertiesCol.deleteMany({ _seed_tag: SEED_TAG });
      console.log(`🗑️  Eski seed propertylar o'chirildi: ${deleted.deletedCount} ta`);
    }

    // ── 1. Mavjud ma'lumotlarni ko'rish ──────────────────────────────────────
    const totalUsers      = await usersCol.countDocuments();
    const totalSellers    = await sellersCol.countDocuments();
    const totalProperties = await propertiesCol.countDocuments();

    console.log('\n📊 Bazadagi mavjud ma\'lumotlar:');
    console.log(`   👤 Users:      ${totalUsers} ta`);
    console.log(`   🏪 Sellers:    ${totalSellers} ta`);
    console.log(`   🏠 Properties: ${totalProperties} ta`);

    // ── 2. Sellerni topish / yaratish ─────────────────────────────────────────
    let sellerUsers = [];

    // Tasdiqlangan sellerlar
    const approvedSellers = await sellersCol
      .find({ status: 'approved' })
      .limit(5)
      .toArray();

    if (approvedSellers.length > 0) {
      console.log(`\n✅ Tasdiqlangan sellerlar topildi: ${approvedSellers.length} ta`);
      sellerUsers = approvedSellers.map(s => s.user);
    } else {
      // Har qanday seller
      const anySellers = await sellersCol.find({}).limit(5).toArray();
      if (anySellers.length > 0) {
        console.log(`\n⚠️  Tasdiqlangan seller yo'q, mavjud sellerlar ishlatiladi: ${anySellers.length} ta`);
        sellerUsers = anySellers.map(s => s.user);
      } else {
        // Seller yo'q — test userlar va sellerlar yaratamiz
        console.log('\n🆕 Seller topilmadi — 3 ta test user/seller yaratilmoqda...');

        const testUsers = [
          {
            first_name: 'Jasur',
            last_name: 'Toshmatov',
            email: { value: 'jasur.seller@test.uz', isVerified: true },
            phone: { value: '+998901234567', isVerified: true },
            role: 'physical',
            provider: 'local',
            lan: 'uz',
            password: '$2b$10$mockhashedpassword123456789012',
            socialAccounts: [],
            isAI: false,
            premiumUntil: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            first_name: 'Dilnoza',
            last_name: 'Karimova',
            email: { value: 'dilnoza.seller@test.uz', isVerified: true },
            phone: { value: '+998907654321', isVerified: true },
            role: 'physical',
            provider: 'local',
            lan: 'uz',
            password: '$2b$10$mockhashedpassword123456789012',
            socialAccounts: [],
            isAI: false,
            premiumUntil: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            first_name: 'Bobur',
            last_name: 'Rahimov',
            email: { value: 'bobur.seller@test.uz', isVerified: true },
            phone: { value: '+998931112233', isVerified: true },
            role: 'physical',
            provider: 'local',
            lan: 'uz',
            password: '$2b$10$mockhashedpassword123456789012',
            socialAccounts: [],
            isAI: false,
            premiumUntil: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ];

        if (!DRY_RUN) {
          const userResult = await usersCol.insertMany(testUsers);
          const userIds = Object.values(userResult.insertedIds);
          console.log(`   ✅ ${userIds.length} ta user yaratildi`);

          // Har bir user uchun seller yaratish
          const sellerDocs = userIds.map((userId, i) => ({
            user: userId,
            passport: `AA${1234567 + i}`,
            business_type: 'physical',
            status: 'approved',
            instagram: `@seller${i + 1}_uz`,
            telegram: `@seller${i + 1}_tg`,
            whatsapp: `+99890${1234567 + i}`,
            createdAt: new Date(),
            updatedAt: new Date(),
          }));

          const sellerResult = await sellersCol.insertMany(sellerDocs);
          const sellerIds = Object.values(sellerResult.insertedIds);
          console.log(`   ✅ ${sellerIds.length} ta seller yaratildi`);

          // PhysicalSeller detail yaratish
          const physicalDocs = sellerIds.map((sellerId, i) => ({
            seller: sellerId,
            first_name: testUsers[i].first_name,
            last_name: testUsers[i].last_name,
            middle_name: ['Aliyevich', 'Ibragimovna', 'Hasanovich'][i],
            birth_date: new Date(`${1985 + i * 3}-0${3 + i}-15`),
            jshshir: String(3010119850 + i + 1).padEnd(14, '0'),
            createdAt: new Date(),
            updatedAt: new Date(),
          }));

          await physicalCol.insertMany(physicalDocs);
          console.log(`   ✅ ${physicalDocs.length} ta physical seller detail yaratildi`);

          sellerUsers = userIds;
        } else {
          console.log('   [DRY RUN] 3 ta user/seller/physical yaratilardi');
          sellerUsers = [new ObjectId(), new ObjectId(), new ObjectId()];
        }
      }
    }

    if (sellerUsers.length === 0) {
      console.error('❌ Author uchun user topilmadi');
      process.exit(1);
    }

    // ── 3. Property larni qo'shish ────────────────────────────────────────────
    console.log(`\n🏠 ${MOCK_PROPERTIES.length} ta property qo'shilmoqda...\n`);

    let inserted = 0;
    const photoSetsCount = PHOTO_SETS.length;

    for (let i = 0; i < MOCK_PROPERTIES.length; i++) {
      const data = MOCK_PROPERTIES[i];
      const authorId = sellerUsers[i % sellerUsers.length];
      const photoSet = PHOTO_SETS[i % photoSetsCount];
      const prop = buildProperty(data, authorId, photoSet);

      if (DRY_RUN) {
        console.log(`  [${i + 1}] ${data.titleUz} — ${data.price} ${data.currency} (${data.category})`);
        console.log(`       Author: ${authorId}, Location: ${LOCATIONS[data.locationIdx].name}`);
      } else {
        await propertiesCol.insertOne(prop);
        console.log(`  ✅ [${i + 1}] ${data.titleUz}`);
        inserted++;
      }
    }

    // ── 4. Natija ─────────────────────────────────────────────────────────────
    if (!DRY_RUN) {
      const newTotal = await propertiesCol.countDocuments();
      const sellers  = await sellersCol.countDocuments();
      const users    = await usersCol.countDocuments();
      const approved = await propertiesCol.countDocuments({ status: 'APPROVED' });

      console.log('\n✅ ────────────────────────────────────────');
      console.log(`   🏠 Qo'shildi:   ${inserted} ta yangi property`);
      console.log(`   🏠 Jami:        ${newTotal} ta property`);
      console.log(`   ✅ APPROVED:    ${approved} ta`);
      console.log(`   🏪 Sellers:     ${sellers} ta`);
      console.log(`   👤 Users:       ${users} ta`);
      console.log('──────────────────────────────────────────\n');
    } else {
      console.log(`\n[DRY RUN] ${MOCK_PROPERTIES.length} ta property qo'shilar edi`);
    }

  } finally {
    await client.close();
  }
}

main().catch(err => {
  console.error('❌ Xatolik:', err.message);
  process.exit(1);
});
