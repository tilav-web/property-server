/**
 * Sellers Seed Script
 * users.md dagi 35 ta telefon raqamiga asoslanib User + Seller yaratadi.
 *
 * Foydalanish:
 *   node scripts/seed-sellers.js              → yaratadi
 *   node scripts/seed-sellers.js --dry-run    → faqat ko'rish
 *   node scripts/seed-sellers.js --check      → bazada nechta bor tekshirish
 */

require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcrypt');

const DRY_RUN = process.argv.includes('--dry-run');
const CHECK   = process.argv.includes('--check');

const MONGO_URL = process.env.MONGODB_URL || 'mongodb://127.0.0.1:27017/property';
const PASSWORD  = '12345678';
const SALT_ROUNDS = 10;

// sellers-list.md dan olingan 35 ta foydalanuvchi
const SELLERS = [
  { first_name: 'Bobur',    last_name: 'Toshmatov',   phone: '+998772237555' },
  { first_name: 'Jasur',    last_name: 'Yusupov',     phone: '+998955060003' },
  { first_name: 'Ulugbek',  last_name: 'Xasanov',     phone: '+998914747793' },
  { first_name: 'Sardor',   last_name: 'Ibragimov',   phone: '+998700375566' },
  { first_name: 'Akbarali', last_name: 'Saidov',      phone: '+998912127888' },
  { first_name: 'Mirzo',    last_name: 'Abdullayev',  phone: '+998990455888' },
  { first_name: 'Sherzod',  last_name: 'Nazarov',     phone: '+998996636384' },
  { first_name: 'Eldor',    last_name: 'Sultonov',    phone: '+998992868808' },
  { first_name: 'Nodir',    last_name: 'Holmatov',    phone: '+998943344444' },
  { first_name: 'Otabek',   last_name: 'Botirov',     phone: '+998920620116' },
  { first_name: 'Behruz',   last_name: 'Qodirov',     phone: '+998884762424' },
  { first_name: 'Zafar',    last_name: 'Raximov',     phone: '+998912211010' },
  { first_name: 'Sanjar',   last_name: 'Mirzayev',    phone: '+998976384545' },
  { first_name: 'Alisher',  last_name: 'Ergashev',    phone: '+998934227773' },
  { first_name: 'Firdavs',  last_name: 'Normatov',    phone: '+998977760500' },
  { first_name: 'Ravshan',  last_name: 'Tursunov',    phone: '+998973173535' },
  { first_name: 'Umid',     last_name: 'Haydarov',    phone: '+998919507007' },
  { first_name: 'Jahongir', last_name: 'Xoliqov',     phone: '+998991464144' },
  { first_name: 'Kamol',    last_name: 'Musayev',     phone: '+998912112656' },
  { first_name: 'Murod',    last_name: 'Tillayev',    phone: '+998904251008' },
  { first_name: 'Dilshod',  last_name: 'Karimov',     phone: '+998972911919' },
  { first_name: 'Akbar',    last_name: 'Mamadaliyev', phone: '+998936900001' },
  { first_name: 'Hamza',    last_name: 'Sotvoldiyev', phone: '+998914680888' },
  { first_name: 'Temur',    last_name: 'Xasanov',     phone: '+998996626622' },
  { first_name: 'Ismoil',   last_name: 'Yusupov',     phone: '+998702290022' },
  { first_name: 'Mansur',   last_name: 'Toshmatov',   phone: '+998939027262' },
  { first_name: 'Bobur',    last_name: 'Ibragimov',   phone: '+998908270207' },
  { first_name: 'Jasur',    last_name: 'Abdullayev',  phone: '+998903266030' },
  { first_name: 'Ulugbek',  last_name: 'Nazarov',     phone: '+998943360030' },
  { first_name: 'Sardor',   last_name: 'Holmatov',    phone: '+998883144334' },
  { first_name: 'Mirzo',    last_name: 'Botirov',     phone: '+998997757107' },
  { first_name: 'Sherzod',  last_name: 'Raximov',     phone: '+998500702111' },
  { first_name: 'Eldor',    last_name: 'Ergashev',    phone: '+998777426040' },
  { first_name: 'Nodir',    last_name: 'Tursunov',    phone: '+998912592525' },
  { first_name: 'Otabek',   last_name: 'Haydarov',    phone: '+998987771525' },
];

// AA0000001 ... AA0000035 — unique passport
function makePassport(index) {
  return `AA${String(index + 1).padStart(7, '0')}`;
}

async function main() {
  const client = new MongoClient(MONGO_URL);
  await client.connect();
  const db = client.db();
  const users   = db.collection('users');
  const sellers = db.collection('sellers');

  if (CHECK) {
    const userCount   = await users.countDocuments({ 'phone.value': { $in: SELLERS.map(s => s.phone) } });
    const sellerCount = await sellers.countDocuments();
    console.log(`\nBazada shu raqamli userlar: ${userCount}/${SELLERS.length}`);
    console.log(`Jami sellerlar: ${sellerCount}`);

    for (const s of SELLERS) {
      const u = await users.findOne({ 'phone.value': s.phone });
      if (u) {
        const sel = await sellers.findOne({ user: u._id });
        console.log(`  ✓ ${s.first_name} ${s.last_name} (${s.phone}) — user: OK, seller: ${sel ? 'OK' : 'YO\'Q'}`);
      } else {
        console.log(`  ✗ ${s.first_name} ${s.last_name} (${s.phone}) — user: YO'Q`);
      }
    }
    await client.close();
    return;
  }

  console.log(`\nMode: ${DRY_RUN ? 'DRY-RUN' : 'PRODUCTION'}`);
  console.log(`Parol: ${PASSWORD} → bcrypt(${SALT_ROUNDS})\n`);

  const hashedPassword = await bcrypt.hash(PASSWORD, SALT_ROUNDS);

  let createdUsers   = 0;
  let skippedUsers   = 0;
  let createdSellers = 0;
  let skippedSellers = 0;

  for (let i = 0; i < SELLERS.length; i++) {
    const s = SELLERS[i];
    const passport = makePassport(i);

    // 1. User yaratish yoki topish
    let userId;
    const existingUser = await users.findOne({ 'phone.value': s.phone });

    if (existingUser) {
      userId = existingUser._id;
      skippedUsers++;
      console.log(`  ~ User mavjud: ${s.first_name} ${s.last_name} (${s.phone})`);
    } else {
      userId = new ObjectId();
      const userDoc = {
        _id: userId,
        first_name: s.first_name,
        last_name: s.last_name,
        phone: { value: s.phone, isVerified: true },
        email: { value: null, isVerified: false },
        provider: 'local',
        socialAccounts: [],
        avatar: null,
        role: 'physical',
        lan: 'uz',
        password: hashedPassword,
        isAI: false,
        premiumUntil: null,
        voicePremiumUntil: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      if (!DRY_RUN) {
        await users.insertOne(userDoc);
      }
      createdUsers++;
      console.log(`  + User yaratildi: ${s.first_name} ${s.last_name} (${s.phone})`);
    }

    // 2. Seller yaratish
    const existingSeller = await sellers.findOne({ user: userId });
    if (existingSeller) {
      skippedSellers++;
      console.log(`    ~ Seller mavjud`);
    } else {
      const sellerDoc = {
        _id: new ObjectId(),
        user: userId,
        passport: passport,
        business_type: 'physical',
        status: 'approved',
        instagram: null,
        telegram: null,
        whatsapp: s.phone,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      if (!DRY_RUN) {
        await sellers.insertOne(sellerDoc);
      }
      createdSellers++;
      console.log(`    + Seller yaratildi (passport: ${passport})`);
    }
  }

  console.log(`\n─────────────────────────────────`);
  console.log(`Users:   ${createdUsers} yaratildi, ${skippedUsers} o'tkazildi`);
  console.log(`Sellers: ${createdSellers} yaratildi, ${skippedSellers} o'tkazildi`);
  if (DRY_RUN) console.log('\n⚠️  DRY-RUN — hech narsa yozilmadi');

  await client.close();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
