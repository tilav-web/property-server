/* eslint-disable no-console */
import 'dotenv/config';
import mongoose, { Schema } from 'mongoose';

interface DeveloperSeed {
  name: string;
  description: string;
  website: string;
  country: string;
  city: string;
  email?: string;
  phone?: string;
  logo?: string;
  cover?: string;
}

// Public information sourced from each developer's official corporate site
// and Wikipedia. No proprietary data — names and descriptions only.
const DEVELOPERS: DeveloperSeed[] = [
  {
    name: 'Sime Darby Property',
    description:
      "Malaysia's leading property developer with over 50 years of experience, known for integrated townships such as Bandar Bukit Raja, City of Elmina and Bandar Universiti Pagoh.",
    website: 'https://www.simedarbyproperty.com',
    country: 'Malaysia',
    city: 'Shah Alam',
  },
  {
    name: 'SP Setia',
    description:
      'Multi-award winning property developer behind Setia Alam, Setia Eco Park, KL Eco City and Battersea Power Station in London.',
    website: 'https://www.spsetia.com',
    country: 'Malaysia',
    city: 'Petaling Jaya',
  },
  {
    name: 'Mah Sing Group',
    description:
      'Malaysian listed lifestyle developer with residential, commercial and industrial projects across Klang Valley, Penang, Johor and Sabah.',
    website: 'https://www.mahsing.com.my',
    country: 'Malaysia',
    city: 'Kuala Lumpur',
  },
  {
    name: 'IOI Properties Group',
    description:
      'Premier developer of integrated townships and high-rise residences including Bandar Puchong Jaya, Bandar Puteri and IOI Resort City.',
    website: 'https://www.ioiproperties.com.my',
    country: 'Malaysia',
    city: 'Putrajaya',
  },
  {
    name: 'Sunway Property',
    description:
      'Property arm of Sunway Group, master-planner of Sunway Integrated Resort City, Sunway Velocity and Sunway Iskandar.',
    website: 'https://www.sunwayproperty.com',
    country: 'Malaysia',
    city: 'Subang Jaya',
  },
  {
    name: 'UEM Sunrise',
    description:
      "One of Malaysia's largest property developers, master developer of Iskandar Puteri in Johor and signature KL projects such as Mont'Kiara and Bukit Bintang City Centre.",
    website: 'https://www.uemsunrise.com',
    country: 'Malaysia',
    city: 'Kuala Lumpur',
  },
  {
    name: 'Eco World Development Group',
    description:
      'Sustainable township developer behind Eco Majestic, Eco Sanctuary, Eco Grandeur and Eco Botanic. Operates in Malaysia and the United Kingdom.',
    website: 'https://www.ecoworld.my',
    country: 'Malaysia',
    city: 'Shah Alam',
  },
  {
    name: 'Tropicana Corporation',
    description:
      'Premium lifestyle developer of Tropicana Gardens, Tropicana Aman, Tropicana Heights and resort developments in Genting Highlands and Langkawi.',
    website: 'https://www.tropicanacorp.com.my',
    country: 'Malaysia',
    city: 'Petaling Jaya',
  },
  {
    name: 'Gamuda Land',
    description:
      'Township developer for Gamuda Cove, Kota Kemuning, twentyfive7 and Gamuda Gardens, with international projects in Vietnam, the UK and Australia.',
    website: 'https://gamudaland.com.my',
    country: 'Malaysia',
    city: 'Petaling Jaya',
  },
  {
    name: 'IGB Berhad',
    description:
      'Developer behind Mid Valley City and The Gardens — one of the largest integrated mixed-use developments in Southeast Asia.',
    website: 'https://www.igbbhd.com',
    country: 'Malaysia',
    city: 'Kuala Lumpur',
  },
  {
    name: 'Glomac Berhad',
    description:
      'Established Malaysian developer with townships and commercial projects in Klang Valley including Bandar Saujana Utama and Saujana Rawang.',
    website: 'https://www.glomac.com.my',
    country: 'Malaysia',
    city: 'Petaling Jaya',
  },
  {
    name: 'LBS Bina Group',
    description:
      'Affordable to mid-range developer with townships such as Bandar Saujana Putra, KITA @ Cybersouth and Alam Perdana.',
    website: 'https://www.lbs.com.my',
    country: 'Malaysia',
    city: 'Petaling Jaya',
  },
  {
    name: 'Boustead Properties',
    description:
      'Property arm of Boustead Holdings; developer of Mutiara Damansara, Mutiara Rini and The Royale Chulan and Royale Bintang hospitality assets.',
    website: 'https://www.boustead.com.my',
    country: 'Malaysia',
    city: 'Kuala Lumpur',
  },
  {
    name: 'Hap Seng Land',
    description:
      'Property division of Hap Seng Consolidated, developer of high-end residential and commercial projects in KLCC and Plaza Hap Seng.',
    website: 'https://www.hapseng.com',
    country: 'Malaysia',
    city: 'Kuala Lumpur',
  },
  {
    name: 'I&P Group',
    description:
      'A subsidiary of S P Setia, developer of established townships such as Bandar Kinrara, Alam Damai and Alam Impian.',
    website: 'https://www.ipgroup.com.my',
    country: 'Malaysia',
    city: 'Petaling Jaya',
  },
  {
    name: 'TA Global',
    description:
      'Property development and investment arm of TA Enterprise; developer of premium projects in Kuala Lumpur, Kota Damansara and overseas.',
    website: 'https://www.taglobal.com.my',
    country: 'Malaysia',
    city: 'Kuala Lumpur',
  },
];

// Minimal schema replica that matches src/modules/developer/developer.schema.ts
const DeveloperSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    description: String,
    logo: String,
    cover: String,
    website: String,
    email: String,
    phone: String,
    telegram: String,
    whatsapp: String,
    country: String,
    city: String,
    projects_count: { type: Number, default: 0 },
    is_active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true, collection: 'developers' },
);

async function main() {
  const uri = process.env.MONGODB_URL;
  if (!uri) {
    throw new Error('MONGODB_URL environment variable is not set');
  }

  await mongoose.connect(uri, { autoIndex: false });
  console.log('Connected to MongoDB');

  const Developer = mongoose.model('Developer', DeveloperSchema);

  let inserted = 0;
  let updated = 0;

  for (const dev of DEVELOPERS) {
    const result = await Developer.updateOne(
      { name: dev.name },
      {
        $set: {
          description: dev.description,
          website: dev.website,
          country: dev.country,
          city: dev.city,
          is_active: true,
        },
        $setOnInsert: {
          name: dev.name,
          projects_count: 0,
        },
      },
      { upsert: true },
    );

    if (result.upsertedCount > 0) {
      inserted += 1;
      console.log(`  + ${dev.name}`);
    } else if (result.modifiedCount > 0) {
      updated += 1;
      console.log(`  ~ ${dev.name}`);
    } else {
      console.log(`  = ${dev.name} (unchanged)`);
    }
  }

  await mongoose.disconnect();
  console.log(
    `\nDone. ${inserted} inserted, ${updated} updated, total ${DEVELOPERS.length} developers seeded.`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
