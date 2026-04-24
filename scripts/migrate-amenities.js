/**
 * Migration: balcony/air_conditioning/parking/elevator boolean fieldlarini
 * amenities arrayga ko'chirish.
 *
 * Schema dedup'dan so'ng eski property'lardagi boolean fieldlar aplikatsiya
 * tomonidan o'qilmay qoladi. Ushbu script:
 *   1. balcony, air_conditioning, parking, elevator === true bo'lgan
 *      property'larni topadi
 *   2. Mos keluvchi enum qiymatlarini amenities arrayga qo'shadi
 *      (agar allaqachon bor bo'lmasa)
 *   3. Eski boolean fieldlarini $unset qiladi
 *
 * Foydalanish:
 *   node scripts/migrate-amenities.js
 *
 * Agar --dry-run flag berilsa, o'zgarishlarni ko'rsatadi, lekin yozmaydi.
 * MONGODB_URL env o'qiladi (.env yoki process env).
 *
 * ⚠️ Scriptni ishga tushirishdan OLDIN DB backup olish tavsiya qilinadi.
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');

const BOOLEAN_FIELDS = ['balcony', 'air_conditioning', 'parking', 'elevator'];

const DRY_RUN = process.argv.includes('--dry-run');

async function main() {
  const uri = process.env.MONGODB_URL;
  if (!uri) {
    console.error('❌ MONGODB_URL environment variable topilmadi');
    process.exit(1);
  }

  console.log(`${DRY_RUN ? '🔍 DRY RUN' : '🚀 WRITE MODE'}: connecting to DB...`);
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db();
    const col = db.collection('properties');

    // Eski boolean fieldlari bor bo'lgan hujjatlarni topamiz
    const query = {
      $or: BOOLEAN_FIELDS.map((f) => ({ [f]: { $exists: true } })),
    };
    const total = await col.countDocuments(query);
    console.log(`📋 Eski boolean fieldlari bor hujjatlar: ${total} ta`);

    if (total === 0) {
      console.log('✅ Migrate qiladigan narsa yo‘q. Tayyor!');
      return;
    }

    const cursor = col.find(query).project({
      _id: 1,
      amenities: 1,
      balcony: 1,
      air_conditioning: 1,
      parking: 1,
      elevator: 1,
    });

    let updated = 0;
    let unchanged = 0;
    const stats = {
      balcony_added: 0,
      air_conditioning_added: 0,
      parking_added: 0,
      elevator_added: 0,
    };

    while (await cursor.hasNext()) {
      const doc = await cursor.next();
      const current = Array.isArray(doc.amenities) ? doc.amenities.slice() : [];
      const next = current.slice();

      for (const field of BOOLEAN_FIELDS) {
        if (doc[field] === true && !next.includes(field)) {
          next.push(field);
          stats[`${field}_added`] += 1;
        }
      }

      const hasNewAmenity = next.length !== current.length;
      const hasOldFields = BOOLEAN_FIELDS.some(
        (f) => doc[f] !== undefined,
      );

      if (!hasNewAmenity && !hasOldFields) {
        unchanged += 1;
        continue;
      }

      if (DRY_RUN) {
        console.log(
          `[dry-run] ${doc._id}: amenities ${JSON.stringify(current)} → ${JSON.stringify(next)}; unset ${BOOLEAN_FIELDS.filter((f) => doc[f] !== undefined).join(', ')}`,
        );
        updated += 1;
        continue;
      }

      const update = {};
      if (hasNewAmenity) {
        update.$set = { amenities: next };
      }
      const unset = {};
      for (const f of BOOLEAN_FIELDS) {
        if (doc[f] !== undefined) unset[f] = '';
      }
      if (Object.keys(unset).length > 0) {
        update.$unset = unset;
      }

      await col.updateOne({ _id: doc._id }, update);
      updated += 1;
    }

    console.log('\n📊 Natija:');
    console.log(`   O'zgartirildi: ${updated}`);
    console.log(`   O'zgartirishsiz: ${unchanged}`);
    for (const [k, v] of Object.entries(stats)) {
      if (v > 0) console.log(`   ${k}: ${v}`);
    }
    if (DRY_RUN) {
      console.log('\n💡 DRY RUN edi — hech narsa yozilmadi.');
      console.log('   Ishga tushirish uchun: node scripts/migrate-amenities.js');
    } else {
      console.log('\n✅ Migration muvaffaqiyatli tugadi.');
    }
  } catch (err) {
    console.error('❌ Migration xatoligi:', err);
    process.exitCode = 1;
  } finally {
    await client.close();
  }
}

main();
