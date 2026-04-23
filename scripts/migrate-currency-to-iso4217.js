/**
 * Migration: currency qiymatlarini ISO 4217 kodlariga o'tkazish.
 *
 * Avvalgi qiymatlar: "rm", "RM", "uzs" (property va advertise kolleksiyalarida).
 * Yangi qiymatlar: "MYR", "UZS".
 *
 * Foydalanish:
 *   node scripts/migrate-currency-to-iso4217.js
 *
 * MONGODB_URL env o'qiladi (.env yoki process env).
 * Scriptni ishga tushirishdan OLDIN database backup olish tavsiya qilinadi.
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');

const MAPPING = {
  rm: 'MYR',
  RM: 'MYR',
  myr: 'MYR',
  uzs: 'UZS',
  UZs: 'UZS',
};

async function migrateCollection(db, collectionName) {
  const col = db.collection(collectionName);
  const stats = {};

  for (const [from, to] of Object.entries(MAPPING)) {
    const res = await col.updateMany(
      { currency: from },
      { $set: { currency: to } },
    );
    if (res.modifiedCount > 0) {
      stats[`${from} → ${to}`] = res.modifiedCount;
    }
  }

  const remaining = await col
    .aggregate([
      { $group: { _id: '$currency', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ])
    .toArray();

  return { stats, remaining };
}

(async () => {
  const uri = process.env.MONGODB_URL;
  if (!uri) {
    console.error('MONGODB_URL env topilmadi.');
    process.exit(1);
  }

  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db();

  console.log('DB:', db.databaseName);
  console.log('Mapping:', MAPPING);
  console.log('---');

  for (const name of ['properties', 'advertises']) {
    console.log(`\n[${name}]`);
    const { stats, remaining } = await migrateCollection(db, name);
    if (Object.keys(stats).length === 0) {
      console.log('  o\'zgartirish yo\'q');
    } else {
      for (const [k, v] of Object.entries(stats)) {
        console.log(`  ${k}: ${v}`);
      }
    }
    console.log('  Hozirgi taqsimot:');
    for (const r of remaining) {
      console.log(`    ${r._id}: ${r.count}`);
    }
  }

  await client.close();
  console.log('\nTugadi.');
})().catch((err) => {
  console.error('Xatolik:', err);
  process.exit(1);
});
