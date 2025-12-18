/**
 * MongoDB 2dsphere indexes yaratish uchun migration skripti
 * 
 * Ishlatish:
 * npx ts-node src/migrations/create-geo-indexes.ts
 * 
 * Yoki NestJS da injekt qilish orqali app.module.ts da:
 * 
 * async onModuleInit() {
 *   await this.createGeoIndexes();
 * }
 */

import * as mongoose from 'mongoose';

const MONGO_URI =
  process.env.MONGO_URI || 'mongodb://localhost:27017/property_db';

async function createGeoIndexes() {
  try {
    // MongoDB ga ulanish
    await mongoose.connect(MONGO_URI);
    console.log('✅ MongoDB ga ulanildi');

    const db = mongoose.connection.db;

    if (!db) {
      throw new Error('Database connection failed');
    }

    // 1️⃣ Properties collectionida 2dsphere index
    const propertiesCollections = [
      'properties',
      'apartment_rents', // agar alohida collection bo'lsa
      'apartment_sales', // agar alohida collection bo'lsa
    ];

    for (const collName of propertiesCollections) {
      try {
        await db.collection(collName).createIndex(
          { location: '2dsphere' },
          { background: true }, // Background da index yaratish (query blok qilmaydi)
        );
        console.log(`✅ ${collName} da 2dsphere index yaratildi`);
      } catch (err: any) {
        if (err.code === 85) {
          // Index allaqachon mavjud
          console.log(`⚠️  ${collName} da index allaqachon mavjud`);
        } else {
          console.error(`❌ ${collName} da xato:`, err.message);
        }
      }
    }

    console.log('✨ Barcha indexlar tayyor!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration xatosi:', error);
    process.exit(1);
  }
}

// Script to'g'ri ishlatilgan bo'lsa run qil
if (require.main === module) {
  createGeoIndexes();
}

export default createGeoIndexes;
