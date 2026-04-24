/**
 * Migration: local `uploads/*` fayllarini DigitalOcean Spaces'ga ko'chirish va
 * MongoDB'dagi URL'larni yangi CDN URL'lariga almashtirish.
 *
 * Bu skript:
 *   1. Barcha kolleksiyalarda (properties, users, sellers, advertises, commissioners)
 *      `{baseUrl}/uploads/...` pattern'ni qidiradi
 *   2. Har bir fayl uchun:
 *      - `uploads/` ostidan fayl'ni o'qiydi
 *      - Rasm bo'lsa → sharp bilan 2 variant (full 1920px + thumb 400px), WebP
 *      - Video/fayl bo'lsa → raw upload
 *      - Spaces'ga PutObject (ACL public-read)
 *      - DB'dagi URL'ni yangi CDN URL'ga almashtiradi
 *   3. Eski fayl'ni o'chirmaydi (arxiv sifatida qoladi)
 *
 * Foydalanish:
 *   node scripts/migrate-uploads-to-spaces.js --dry-run   # preview
 *   node scripts/migrate-uploads-to-spaces.js             # real migration
 *
 * Kerakli env: MONGODB_URL, SERVER_URL, DO_SPACES_*
 *
 * ⚠️ Ishga tushirishdan OLDIN DB backup oling.
 */

require('dotenv').config();
// libvips SIMD warninglarini yashirish (eski CPU'larda shovqin yaratadi)
process.env.VIPS_WARNING = '0';
const { MongoClient } = require('mongodb');
const {
  S3Client,
  PutObjectCommand,
} = require('@aws-sdk/client-s3');
const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const sharp = require('sharp');

const DRY_RUN = process.argv.includes('--dry-run');
const LIMIT_FLAG = process.argv.find((a) => a.startsWith('--limit='));
const LIMIT = LIMIT_FLAG ? parseInt(LIMIT_FLAG.split('=')[1], 10) : Infinity;

const PHOTO_FOLDERS = new Set(['photos', 'avatars']);
const FULL_MAX_WIDTH = 1920;
const THUMB_MAX_WIDTH = 400;
const WEBP_QUALITY = 80;

const UPLOADS_ROOT = path.resolve(__dirname, '..', 'uploads');

// Kolleksiya → har xil yo'llarga qarab URL'ni olish va yangilash
const TARGETS = [
  {
    collection: 'properties',
    fields: [
      { path: 'photos', type: 'array', folder: 'photos' },
      { path: 'videos', type: 'array', folder: 'videos' },
    ],
  },
  {
    collection: 'users',
    fields: [{ path: 'avatar', type: 'string', folder: 'avatars' }],
  },
  {
    collection: 'sellers',
    fields: [
      { path: 'passport_file', type: 'string', folder: 'files' },
      { path: 'vat_file', type: 'string', folder: 'files' },
      { path: 'ytt_certificate_file', type: 'string', folder: 'files' },
      { path: 'charter_file', type: 'string', folder: 'files' },
      { path: 'guarantee_letter_file', type: 'string', folder: 'files' },
      { path: 'real_estate_activity_license_file', type: 'string', folder: 'files' },
    ],
  },
  {
    collection: 'advertises',
    fields: [{ path: 'image', type: 'string', folder: 'photos' }],
  },
  {
    collection: 'commissioners',
    fields: [{ path: 'contract_file', type: 'string', folder: 'files' }],
  },
];

function env(name, required = true) {
  const v = process.env[name];
  if (!v && required) {
    console.error(`❌ ${name} env topilmadi`);
    process.exit(1);
  }
  return v;
}

const MONGODB_URL = env('MONGODB_URL');
const SERVER_URL = env('SERVER_URL').replace(/\/$/, '');
const BUCKET = env('DO_SPACES_BUCKET');
const ENDPOINT = env('DO_SPACES_ENDPOINT');
const REGION = env('DO_SPACES_REGION');
const CDN_BASE = (process.env.DO_SPACES_CDN_URL || '').replace(/\/$/, '');

const s3 = new S3Client({
  endpoint: ENDPOINT,
  region: REGION,
  forcePathStyle: false,
  credentials: {
    accessKeyId: env('DO_SPACES_KEY'),
    secretAccessKey: env('DO_SPACES_SECRET'),
  },
});

function cdnUrl(key) {
  if (CDN_BASE) return `${CDN_BASE}/${key}`;
  return `${ENDPOINT.replace('https://', `https://${BUCKET}.`)}/${key}`;
}

function randomBaseName() {
  return `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
}

function mimeFromExt(ext) {
  const m = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
    '.heic': 'image/heic',
    '.mp4': 'video/mp4',
    '.mov': 'video/quicktime',
    '.webm': 'video/webm',
    '.pdf': 'application/pdf',
  };
  return m[ext] || 'application/octet-stream';
}

async function uploadOne(localPath, folder) {
  const buffer = await fs.readFile(localPath);
  const ext = path.extname(localPath).toLowerCase();
  const baseName = randomBaseName();
  const isImage = /^image\//.test(mimeFromExt(ext));

  if (isImage && PHOTO_FOLDERS.has(folder)) {
    const base = sharp(buffer, { failOn: 'none' }).rotate();
    const [fullBuf, thumbBuf] = await Promise.all([
      base
        .clone()
        .resize({
          width: FULL_MAX_WIDTH,
          withoutEnlargement: true,
          fit: 'inside',
        })
        .webp({ quality: WEBP_QUALITY })
        .toBuffer(),
      base
        .clone()
        .resize({
          width: THUMB_MAX_WIDTH,
          withoutEnlargement: true,
          fit: 'inside',
        })
        .webp({ quality: WEBP_QUALITY })
        .toBuffer(),
    ]);

    const fullKey = `${folder}/${baseName}.webp`;
    const thumbKey = `${folder}/${baseName}_thumb.webp`;

    if (!DRY_RUN) {
      await Promise.all([
        s3.send(
          new PutObjectCommand({
            Bucket: BUCKET,
            Key: fullKey,
            Body: fullBuf,
            ContentType: 'image/webp',
            ACL: 'public-read',
            CacheControl: 'public, max-age=31536000, immutable',
          }),
        ),
        s3.send(
          new PutObjectCommand({
            Bucket: BUCKET,
            Key: thumbKey,
            Body: thumbBuf,
            ContentType: 'image/webp',
            ACL: 'public-read',
            CacheControl: 'public, max-age=31536000, immutable',
          }),
        ),
      ]);
    }
    return cdnUrl(fullKey);
  }

  // raw upload (videos, docs, etc.)
  const key = `${folder}/${baseName}${ext}`;
  if (!DRY_RUN) {
    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: buffer,
        ContentType: mimeFromExt(ext),
        ACL: 'public-read',
        CacheControl: 'public, max-age=31536000, immutable',
      }),
    );
  }
  return cdnUrl(key);
}

function isLegacyUrl(url) {
  return typeof url === 'string' && url.includes('/uploads/');
}

function urlToLocalPath(url) {
  try {
    const u = new URL(url);
    const p = decodeURIComponent(u.pathname.replace(/^\/+/, '').replace(/^uploads[\\/]/, ''));
    return path.join(UPLOADS_ROOT, p);
  } catch {
    return null;
  }
}

async function migrateUrl(url, folder, stats) {
  const localPath = urlToLocalPath(url);
  if (!localPath) return url;
  try {
    await fs.access(localPath);
  } catch {
    stats.missing++;
    console.warn(`  ⚠ fayl topilmadi: ${url}`);
    return url;
  }
  const newUrl = await uploadOne(localPath, folder);
  stats.migrated++;
  const arrow = DRY_RUN ? '…' : '✓';
  console.log(`  ${arrow} ${path.basename(localPath)} → ${newUrl}`);
  return newUrl;
}

async function main() {
  console.log(`${DRY_RUN ? '🔍 DRY RUN' : '🚀 WRITE MODE'}  limit=${LIMIT}`);
  const client = new MongoClient(MONGODB_URL);
  const stats = { migrated: 0, missing: 0, updatedDocs: 0 };
  let processed = 0;

  try {
    await client.connect();
    const db = client.db();

    for (const target of TARGETS) {
      if (processed >= LIMIT) break;
      const col = db.collection(target.collection);
      const filter = { $or: target.fields.map((f) => ({ [f.path]: { $regex: '/uploads/' } })) };
      const cursor = col.find(filter);

      console.log(`\n📦 ${target.collection}: skanerlanmoqda...`);
      let count = 0;
      while (await cursor.hasNext()) {
        if (processed >= LIMIT) break;
        const doc = await cursor.next();
        const updates = {};
        for (const field of target.fields) {
          const value = doc[field.path];
          if (field.type === 'array' && Array.isArray(value)) {
            const newArr = [];
            let changed = false;
            for (const url of value) {
              if (isLegacyUrl(url)) {
                const newUrl = await migrateUrl(url, field.folder, stats);
                newArr.push(newUrl);
                if (newUrl !== url) changed = true;
              } else {
                newArr.push(url);
              }
            }
            if (changed) updates[field.path] = newArr;
          } else if (field.type === 'string' && isLegacyUrl(value)) {
            const newUrl = await migrateUrl(value, field.folder, stats);
            if (newUrl !== value) updates[field.path] = newUrl;
          }
        }

        if (Object.keys(updates).length) {
          if (!DRY_RUN) {
            await col.updateOne({ _id: doc._id }, { $set: updates });
          }
          stats.updatedDocs++;
          count++;
          processed++;
        }
      }
      console.log(`  ${count} ta ${target.collection} hujjati yangilandi`);
    }

    console.log('\n📊 Xulosa:');
    console.log(`  Yangi URL (Spaces'ga yuklangan): ${stats.migrated}`);
    console.log(`  Local faylni topib bo'lmadi:      ${stats.missing}`);
    console.log(`  Yangilangan DB hujjatlar:          ${stats.updatedDocs}`);
    console.log(DRY_RUN ? '\n(DRY RUN — hech narsa yozilmadi)' : '\n✅ Tugadi');
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
