/* eslint-disable no-console */
import 'dotenv/config';
import mongoose, { Schema, Types } from 'mongoose';

interface ProjectSeed {
  developerName: string;
  name: string;
  description: string;
  address: string;
  city: string;
  country: string;
  delivery_date: string;
  status: 'pre_launch' | 'on_sale' | 'sold_out' | 'completed';
  launch_price: number;
  currency: string;
  unit_types: Array<{
    category:
      | 'apartment'
      | 'townhouse'
      | 'villa'
      | 'penthouse'
      | 'studio'
      | 'office';
    bedrooms_min?: number;
    bedrooms_max?: number;
    area_min?: number;
    area_max?: number;
    price_from?: number;
  }>;
  payment_plans: Array<{
    name: string;
    deposit_percent?: number;
    description?: string;
  }>;
  photos: string[];
  is_featured?: boolean;
  longitude: number;
  latitude: number;
}

// Free, hotlinkable Unsplash images (royalty-free)
const HERO_IMAGES = {
  modern_high_rise:
    'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80',
  luxury_skyline:
    'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80',
  garden_residence:
    'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1200&q=80',
  glass_tower:
    'https://images.unsplash.com/photo-1486325212027-8081e485255e?auto=format&fit=crop&w=1200&q=80',
  beachfront:
    'https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?auto=format&fit=crop&w=1200&q=80',
  villa_pool:
    'https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=1200&q=80',
  loft_interior:
    'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=80',
  pent_balcony:
    'https://images.unsplash.com/photo-1567496898669-ee935f5f647a?auto=format&fit=crop&w=1200&q=80',
  green_low_rise:
    'https://images.unsplash.com/photo-1572120360610-d971b9d7767c?auto=format&fit=crop&w=1200&q=80',
  twin_tower:
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
  resort_living:
    'https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?auto=format&fit=crop&w=1200&q=80',
  city_lights:
    'https://images.unsplash.com/photo-1448630360428-65456885c650?auto=format&fit=crop&w=1200&q=80',
};

// Approximate coordinates of Malaysian neighborhoods/townships (publicly known)
const PROJECTS: ProjectSeed[] = [
  // Sime Darby Property
  {
    developerName: 'Sime Darby Property',
    name: 'Elmina Valley Five',
    description:
      'A leafy township in Shah Alam offering link homes within City of Elmina, with parks, lakes, and a 300-acre Central Park nearby.',
    address: 'City of Elmina, Shah Alam',
    city: 'Selangor',
    country: 'Malaysia',
    delivery_date: 'Q4 2027',
    status: 'on_sale',
    launch_price: 950000,
    currency: 'MYR',
    unit_types: [
      {
        category: 'townhouse',
        bedrooms_min: 4,
        bedrooms_max: 5,
        area_min: 2200,
        area_max: 2800,
        price_from: 950000,
      },
    ],
    payment_plans: [
      { name: '10/90', deposit_percent: 10, description: '10% on signing, 90% on completion.' },
    ],
    photos: [HERO_IMAGES.green_low_rise],
    is_featured: true,
    longitude: 101.4831,
    latitude: 3.1871,
  },
  {
    developerName: 'Sime Darby Property',
    name: 'KL East Phase 4',
    description:
      'Hillside residences set against Klang Gates Quartz Ridge, surrounded by 22-acre rainforest park.',
    address: 'KL East, Kuala Lumpur',
    city: 'Kuala Lumpur',
    country: 'Malaysia',
    delivery_date: 'Q2 2028',
    status: 'on_sale',
    launch_price: 1180000,
    currency: 'MYR',
    unit_types: [
      {
        category: 'apartment',
        bedrooms_min: 2,
        bedrooms_max: 4,
        area_min: 1100,
        area_max: 2050,
        price_from: 1180000,
      },
    ],
    payment_plans: [
      { name: '20/80', deposit_percent: 20, description: 'Standard developer payment plan.' },
    ],
    photos: [HERO_IMAGES.luxury_skyline],
    longitude: 101.7632,
    latitude: 3.219,
  },

  // SP Setia
  {
    developerName: 'SP Setia',
    name: 'Setia City Residences',
    description:
      'Lakeside high-rise condominiums next to Setia City Mall and Setia City Park.',
    address: 'Setia Alam, Selangor',
    city: 'Selangor',
    country: 'Malaysia',
    delivery_date: 'Q1 2027',
    status: 'on_sale',
    launch_price: 720000,
    currency: 'MYR',
    unit_types: [
      {
        category: 'apartment',
        bedrooms_min: 2,
        bedrooms_max: 3,
        area_min: 980,
        area_max: 1500,
        price_from: 720000,
      },
    ],
    payment_plans: [
      { name: '10/90', deposit_percent: 10 },
      { name: '20/40/40', deposit_percent: 20 },
    ],
    photos: [HERO_IMAGES.modern_high_rise],
    is_featured: true,
    longitude: 101.4583,
    latitude: 3.1006,
  },
  {
    developerName: 'SP Setia',
    name: 'KL Eco City — Vogue Suites',
    description:
      'Iconic mixed-use development directly across Mid Valley with retail, offices and luxury suites.',
    address: 'KL Eco City, Bangsar',
    city: 'Kuala Lumpur',
    country: 'Malaysia',
    delivery_date: 'Q3 2026',
    status: 'on_sale',
    launch_price: 1320000,
    currency: 'MYR',
    unit_types: [
      {
        category: 'apartment',
        bedrooms_min: 1,
        bedrooms_max: 3,
        area_min: 700,
        area_max: 1850,
        price_from: 1320000,
      },
      { category: 'penthouse', bedrooms_min: 4, area_min: 3500, price_from: 4500000 },
    ],
    payment_plans: [{ name: '10/90', deposit_percent: 10 }],
    photos: [HERO_IMAGES.glass_tower],
    longitude: 101.673,
    latitude: 3.116,
  },

  // Mah Sing
  {
    developerName: 'Mah Sing Group',
    name: 'M Vertica',
    description:
      'Five-tower freehold serviced residence in Cheras with direct LRT access to KLCC.',
    address: 'Cheras, Kuala Lumpur',
    city: 'Kuala Lumpur',
    country: 'Malaysia',
    delivery_date: 'Q1 2027',
    status: 'on_sale',
    launch_price: 580000,
    currency: 'MYR',
    unit_types: [
      {
        category: 'apartment',
        bedrooms_min: 2,
        bedrooms_max: 3,
        area_min: 850,
        area_max: 1200,
        price_from: 580000,
      },
    ],
    payment_plans: [{ name: 'Easy Own 10/90', deposit_percent: 10 }],
    photos: [HERO_IMAGES.twin_tower],
    longitude: 101.7372,
    latitude: 3.1138,
  },
  {
    developerName: 'Mah Sing Group',
    name: 'Meridin East',
    description:
      'A masterplanned 1,312-acre township in Pasir Gudang with a Garden City theme.',
    address: 'Pasir Gudang, Johor',
    city: 'Johor Bahru',
    country: 'Malaysia',
    delivery_date: 'Q4 2027',
    status: 'on_sale',
    launch_price: 480000,
    currency: 'MYR',
    unit_types: [
      {
        category: 'townhouse',
        bedrooms_min: 3,
        bedrooms_max: 4,
        area_min: 1700,
        area_max: 2200,
        price_from: 480000,
      },
    ],
    payment_plans: [{ name: '10/90', deposit_percent: 10 }],
    photos: [HERO_IMAGES.green_low_rise],
    longitude: 103.8973,
    latitude: 1.471,
  },

  // IOI Properties
  {
    developerName: 'IOI Properties Group',
    name: 'IOI Central Boulevard Towers',
    description:
      'Premium grade-A serviced suites in Putrajaya with a sky lobby and lifestyle deck.',
    address: 'Putrajaya, Federal Territory',
    city: 'Putrajaya',
    country: 'Malaysia',
    delivery_date: 'Q3 2028',
    status: 'pre_launch',
    launch_price: 980000,
    currency: 'MYR',
    unit_types: [
      {
        category: 'apartment',
        bedrooms_min: 2,
        bedrooms_max: 3,
        area_min: 1050,
        area_max: 1500,
        price_from: 980000,
      },
    ],
    payment_plans: [
      { name: '10/90', deposit_percent: 10 },
      { name: '20/40/40', deposit_percent: 20 },
    ],
    photos: [HERO_IMAGES.glass_tower],
    is_featured: true,
    longitude: 101.6943,
    latitude: 2.9264,
  },
  {
    developerName: 'IOI Properties Group',
    name: 'Marina Cove',
    description:
      'Waterfront residences within IOI Resort City overlooking the lake.',
    address: 'IOI Resort City, Putrajaya',
    city: 'Putrajaya',
    country: 'Malaysia',
    delivery_date: 'Q2 2027',
    status: 'on_sale',
    launch_price: 850000,
    currency: 'MYR',
    unit_types: [
      {
        category: 'apartment',
        bedrooms_min: 2,
        bedrooms_max: 4,
        area_min: 1100,
        area_max: 2300,
        price_from: 850000,
      },
    ],
    payment_plans: [{ name: '10/90', deposit_percent: 10 }],
    photos: [HERO_IMAGES.beachfront],
    longitude: 101.6885,
    latitude: 2.9456,
  },

  // Sunway Property
  {
    developerName: 'Sunway Property',
    name: 'Sunway Velocity Two',
    description:
      'Integrated township phase 2 with retail, hospital and university minutes away.',
    address: 'Cheras, Kuala Lumpur',
    city: 'Kuala Lumpur',
    country: 'Malaysia',
    delivery_date: 'Q1 2028',
    status: 'on_sale',
    launch_price: 720000,
    currency: 'MYR',
    unit_types: [
      {
        category: 'apartment',
        bedrooms_min: 2,
        bedrooms_max: 3,
        area_min: 850,
        area_max: 1400,
        price_from: 720000,
      },
    ],
    payment_plans: [{ name: '10/90', deposit_percent: 10 }],
    photos: [HERO_IMAGES.city_lights],
    longitude: 101.7261,
    latitude: 3.1271,
  },
  {
    developerName: 'Sunway Property',
    name: 'Sunway GeoLake Residences',
    description:
      'Lakeside condos within Sunway South Quay, walking distance to Sunway Pyramid.',
    address: 'Bandar Sunway, Selangor',
    city: 'Selangor',
    country: 'Malaysia',
    delivery_date: 'Q4 2026',
    status: 'on_sale',
    launch_price: 880000,
    currency: 'MYR',
    unit_types: [
      {
        category: 'apartment',
        bedrooms_min: 2,
        bedrooms_max: 3,
        area_min: 950,
        area_max: 1500,
        price_from: 880000,
      },
      { category: 'penthouse', bedrooms_min: 4, area_min: 3000, price_from: 3200000 },
    ],
    payment_plans: [
      { name: '10/90', deposit_percent: 10 },
      { name: 'Bumi 30/70', deposit_percent: 30 },
    ],
    photos: [HERO_IMAGES.resort_living],
    longitude: 101.6093,
    latitude: 3.0729,
  },

  // UEM Sunrise
  {
    developerName: 'UEM Sunrise',
    name: 'Bukit Bintang City Centre',
    description:
      "BBCC — a 19.4-acre integrated development right at KL's golden triangle.",
    address: 'Bukit Bintang, Kuala Lumpur',
    city: 'Kuala Lumpur',
    country: 'Malaysia',
    delivery_date: 'Q2 2027',
    status: 'on_sale',
    launch_price: 1450000,
    currency: 'MYR',
    unit_types: [
      {
        category: 'apartment',
        bedrooms_min: 1,
        bedrooms_max: 3,
        area_min: 700,
        area_max: 1700,
        price_from: 1450000,
      },
    ],
    payment_plans: [
      { name: '10/90', deposit_percent: 10 },
      { name: '20/40/40', deposit_percent: 20 },
    ],
    photos: [HERO_IMAGES.luxury_skyline],
    is_featured: true,
    longitude: 101.7102,
    latitude: 3.1471,
  },
  {
    developerName: 'UEM Sunrise',
    name: "Mont'Kiara Sefina",
    description: "Family-oriented condominium in the heart of Mont'Kiara.",
    address: "Mont'Kiara, Kuala Lumpur",
    city: 'Kuala Lumpur',
    country: 'Malaysia',
    delivery_date: 'Q3 2026',
    status: 'on_sale',
    launch_price: 1280000,
    currency: 'MYR',
    unit_types: [
      {
        category: 'apartment',
        bedrooms_min: 3,
        bedrooms_max: 4,
        area_min: 1450,
        area_max: 2400,
        price_from: 1280000,
      },
    ],
    payment_plans: [{ name: '10/90', deposit_percent: 10 }],
    photos: [HERO_IMAGES.modern_high_rise],
    longitude: 101.6489,
    latitude: 3.1721,
  },

  // Eco World
  {
    developerName: 'Eco World Development Group',
    name: 'Eco Sanctuary',
    description:
      'A nature-themed township in Telok Panglima Garang with low-density homes.',
    address: 'Telok Panglima Garang, Selangor',
    city: 'Selangor',
    country: 'Malaysia',
    delivery_date: 'Q1 2027',
    status: 'on_sale',
    launch_price: 1100000,
    currency: 'MYR',
    unit_types: [
      {
        category: 'townhouse',
        bedrooms_min: 4,
        bedrooms_max: 5,
        area_min: 2400,
        area_max: 3200,
        price_from: 1100000,
      },
    ],
    payment_plans: [{ name: '10/90', deposit_percent: 10 }],
    photos: [HERO_IMAGES.villa_pool],
    longitude: 101.5114,
    latitude: 2.9685,
  },
  {
    developerName: 'Eco World Development Group',
    name: 'Eco Botanic 2',
    description:
      'Botanical-themed township in Iskandar Puteri close to international schools.',
    address: 'Iskandar Puteri, Johor',
    city: 'Johor Bahru',
    country: 'Malaysia',
    delivery_date: 'Q4 2026',
    status: 'on_sale',
    launch_price: 950000,
    currency: 'MYR',
    unit_types: [
      {
        category: 'townhouse',
        bedrooms_min: 4,
        bedrooms_max: 5,
        area_min: 2200,
        area_max: 3000,
        price_from: 950000,
      },
    ],
    payment_plans: [{ name: '10/90', deposit_percent: 10 }],
    photos: [HERO_IMAGES.green_low_rise],
    longitude: 103.6124,
    latitude: 1.4326,
  },

  // Tropicana
  {
    developerName: 'Tropicana Corporation',
    name: 'Tropicana Gardens — Arnica',
    description:
      'Integrated mixed-development with direct MRT link to Kota Damansara.',
    address: 'Kota Damansara, Selangor',
    city: 'Selangor',
    country: 'Malaysia',
    delivery_date: 'Q2 2027',
    status: 'on_sale',
    launch_price: 1180000,
    currency: 'MYR',
    unit_types: [
      {
        category: 'apartment',
        bedrooms_min: 2,
        bedrooms_max: 3,
        area_min: 950,
        area_max: 1450,
        price_from: 1180000,
      },
    ],
    payment_plans: [{ name: '10/90', deposit_percent: 10 }],
    photos: [HERO_IMAGES.glass_tower],
    longitude: 101.5832,
    latitude: 3.1525,
  },
  {
    developerName: 'Tropicana Corporation',
    name: 'Tropicana Aman — Mizumi',
    description: 'Lakefront homes within a 863-acre integrated township.',
    address: 'Telok Panglima Garang, Selangor',
    city: 'Selangor',
    country: 'Malaysia',
    delivery_date: 'Q1 2028',
    status: 'pre_launch',
    launch_price: 1050000,
    currency: 'MYR',
    unit_types: [
      {
        category: 'townhouse',
        bedrooms_min: 4,
        bedrooms_max: 5,
        area_min: 2300,
        area_max: 2900,
        price_from: 1050000,
      },
    ],
    payment_plans: [{ name: '10/90', deposit_percent: 10 }],
    photos: [HERO_IMAGES.villa_pool],
    longitude: 101.5046,
    latitude: 2.9722,
  },

  // Gamuda Land
  {
    developerName: 'Gamuda Land',
    name: 'Gamuda Cove — Casa Cove',
    description:
      'Forest-fringe township next to Gamuda Cove Wetlands.',
    address: 'Gamuda Cove, Selangor',
    city: 'Selangor',
    country: 'Malaysia',
    delivery_date: 'Q4 2027',
    status: 'on_sale',
    launch_price: 920000,
    currency: 'MYR',
    unit_types: [
      {
        category: 'townhouse',
        bedrooms_min: 4,
        bedrooms_max: 4,
        area_min: 2200,
        area_max: 2700,
        price_from: 920000,
      },
    ],
    payment_plans: [{ name: '10/90', deposit_percent: 10 }],
    photos: [HERO_IMAGES.green_low_rise],
    is_featured: true,
    longitude: 101.5934,
    latitude: 2.835,
  },
  {
    developerName: 'Gamuda Land',
    name: 'twentyfive7 — Glade',
    description:
      'A 257-acre township in Kota Kemuning with a 24/7 lifestyle hub.',
    address: 'Kota Kemuning, Shah Alam',
    city: 'Selangor',
    country: 'Malaysia',
    delivery_date: 'Q2 2027',
    status: 'on_sale',
    launch_price: 780000,
    currency: 'MYR',
    unit_types: [
      {
        category: 'townhouse',
        bedrooms_min: 3,
        bedrooms_max: 4,
        area_min: 1900,
        area_max: 2400,
        price_from: 780000,
      },
    ],
    payment_plans: [{ name: '10/90', deposit_percent: 10 }],
    photos: [HERO_IMAGES.modern_high_rise],
    longitude: 101.5252,
    latitude: 3.0064,
  },

  // IGB
  {
    developerName: 'IGB Berhad',
    name: 'The Robertson Residences',
    description: 'Luxury serviced residences within The Robertson @ Bukit Bintang.',
    address: 'Bukit Bintang, Kuala Lumpur',
    city: 'Kuala Lumpur',
    country: 'Malaysia',
    delivery_date: 'Q3 2026',
    status: 'on_sale',
    launch_price: 1680000,
    currency: 'MYR',
    unit_types: [
      {
        category: 'apartment',
        bedrooms_min: 1,
        bedrooms_max: 3,
        area_min: 800,
        area_max: 1900,
        price_from: 1680000,
      },
    ],
    payment_plans: [{ name: '10/90', deposit_percent: 10 }],
    photos: [HERO_IMAGES.loft_interior],
    longitude: 101.7035,
    latitude: 3.1437,
  },

  // Glomac
  {
    developerName: 'Glomac Berhad',
    name: 'Saujana Perdana — Phase 7',
    description:
      'Mature township in Sungai Buloh with rail access and shoplots.',
    address: 'Sungai Buloh, Selangor',
    city: 'Selangor',
    country: 'Malaysia',
    delivery_date: 'Q1 2027',
    status: 'on_sale',
    launch_price: 540000,
    currency: 'MYR',
    unit_types: [
      {
        category: 'townhouse',
        bedrooms_min: 3,
        bedrooms_max: 4,
        area_min: 1800,
        area_max: 2200,
        price_from: 540000,
      },
    ],
    payment_plans: [{ name: '10/90', deposit_percent: 10 }],
    photos: [HERO_IMAGES.green_low_rise],
    longitude: 101.5572,
    latitude: 3.2068,
  },

  // LBS
  {
    developerName: 'LBS Bina Group',
    name: 'KITA @ Cybersouth — Bayu',
    description:
      'Affordable double-storey homes in Cybersouth with smart home features.',
    address: 'Dengkil, Selangor',
    city: 'Selangor',
    country: 'Malaysia',
    delivery_date: 'Q2 2027',
    status: 'on_sale',
    launch_price: 480000,
    currency: 'MYR',
    unit_types: [
      {
        category: 'townhouse',
        bedrooms_min: 4,
        bedrooms_max: 4,
        area_min: 1800,
        area_max: 2100,
        price_from: 480000,
      },
    ],
    payment_plans: [{ name: '10/90', deposit_percent: 10 }],
    photos: [HERO_IMAGES.green_low_rise],
    longitude: 101.6703,
    latitude: 2.8498,
  },

  // Boustead
  {
    developerName: 'Boustead Properties',
    name: 'Mutiara Damansara Phase 5',
    description:
      'Established mature commercial-cum-residential district near 1 Utama.',
    address: 'Mutiara Damansara, Selangor',
    city: 'Selangor',
    country: 'Malaysia',
    delivery_date: 'Q3 2027',
    status: 'pre_launch',
    launch_price: 1320000,
    currency: 'MYR',
    unit_types: [
      {
        category: 'apartment',
        bedrooms_min: 2,
        bedrooms_max: 3,
        area_min: 1100,
        area_max: 1700,
        price_from: 1320000,
      },
    ],
    payment_plans: [{ name: '10/90', deposit_percent: 10 }],
    photos: [HERO_IMAGES.modern_high_rise],
    longitude: 101.6112,
    latitude: 3.158,
  },

  // Hap Seng
  {
    developerName: 'Hap Seng Land',
    name: 'Plaza Kingfisher Residences',
    description: 'Premium mixed-use development in Kota Kinabalu waterfront.',
    address: 'Kota Kinabalu, Sabah',
    city: 'Kota Kinabalu',
    country: 'Malaysia',
    delivery_date: 'Q4 2027',
    status: 'on_sale',
    launch_price: 880000,
    currency: 'MYR',
    unit_types: [
      {
        category: 'apartment',
        bedrooms_min: 1,
        bedrooms_max: 3,
        area_min: 700,
        area_max: 1600,
        price_from: 880000,
      },
    ],
    payment_plans: [{ name: '10/90', deposit_percent: 10 }],
    photos: [HERO_IMAGES.beachfront],
    longitude: 116.0735,
    latitude: 5.9804,
  },

  // I&P Group
  {
    developerName: 'I&P Group',
    name: 'Bandar Kinrara — Cendrawasih',
    description: 'Established township in Puchong with mature amenities.',
    address: 'Bandar Kinrara, Puchong',
    city: 'Selangor',
    country: 'Malaysia',
    delivery_date: 'Q1 2027',
    status: 'on_sale',
    launch_price: 690000,
    currency: 'MYR',
    unit_types: [
      {
        category: 'townhouse',
        bedrooms_min: 4,
        bedrooms_max: 4,
        area_min: 2000,
        area_max: 2400,
        price_from: 690000,
      },
    ],
    payment_plans: [{ name: '10/90', deposit_percent: 10 }],
    photos: [HERO_IMAGES.green_low_rise],
    longitude: 101.6483,
    latitude: 3.0577,
  },

  // TA Global
  {
    developerName: 'TA Global',
    name: 'Damansara Avenue — Naluri',
    description:
      'Smart-home serviced residences near Mutiara Damansara MRT.',
    address: 'Damansara Avenue, Selangor',
    city: 'Selangor',
    country: 'Malaysia',
    delivery_date: 'Q4 2026',
    status: 'on_sale',
    launch_price: 980000,
    currency: 'MYR',
    unit_types: [
      {
        category: 'apartment',
        bedrooms_min: 2,
        bedrooms_max: 3,
        area_min: 950,
        area_max: 1500,
        price_from: 980000,
      },
    ],
    payment_plans: [{ name: '10/90', deposit_percent: 10 }],
    photos: [HERO_IMAGES.glass_tower],
    longitude: 101.6049,
    latitude: 3.1604,
  },
];

const DeveloperSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    projects_count: { type: Number, default: 0 },
  },
  { strict: false, timestamps: true, collection: 'developers' },
);

const ProjectUnitTypeSchema = new Schema(
  {
    category: { type: String, required: true },
    bedrooms_min: Number,
    bedrooms_max: Number,
    area_min: Number,
    area_max: Number,
    price_from: Number,
    count: Number,
  },
  { _id: false },
);

const ProjectPaymentPlanSchema = new Schema(
  {
    name: { type: String, required: true },
    deposit_percent: Number,
    description: String,
  },
  { _id: false },
);

const LocationSchema = new Schema(
  {
    type: { type: String, enum: ['Point'], default: 'Point', required: true },
    coordinates: { type: [Number], required: true },
  },
  { _id: false },
);

const ProjectSchema = new Schema(
  {
    developer: { type: Types.ObjectId, ref: 'Developer', required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: String,
    address: String,
    country: String,
    city: { type: String, index: true },
    location: LocationSchema,
    delivery_date: String,
    status: { type: String, default: 'on_sale', index: true },
    launch_price: Number,
    currency: { type: String, default: 'MYR' },
    unit_types: [ProjectUnitTypeSchema],
    payment_plans: [ProjectPaymentPlanSchema],
    photos: [String],
    brochure: String,
    video_url: String,
    is_featured: { type: Boolean, default: false, index: true },
    views: { type: Number, default: 0 },
  },
  { timestamps: true, collection: 'projects' },
);

async function main() {
  const uri = process.env.MONGODB_URL;
  if (!uri) {
    throw new Error('MONGODB_URL environment variable is not set');
  }

  await mongoose.connect(uri, { autoIndex: false });
  console.log('Connected to MongoDB');

  const Developer = mongoose.model('Developer', DeveloperSchema);
  const Project = mongoose.model('Project', ProjectSchema);

  // Index developers by name once
  const allDevs = await Developer.find().select('_id name').lean();
  const devByName = new Map<string, Types.ObjectId>(
    allDevs.map((d) => [d.name, d._id as Types.ObjectId]),
  );

  if (devByName.size === 0) {
    throw new Error(
      'No developers found. Run "npm run seed:developers" first.',
    );
  }

  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  const touchedDevs = new Set<string>();

  for (const proj of PROJECTS) {
    const devId = devByName.get(proj.developerName);
    if (!devId) {
      console.warn(`  ! Developer not found: ${proj.developerName} — skipping ${proj.name}`);
      skipped += 1;
      continue;
    }

    const set = {
      developer: devId,
      description: proj.description,
      address: proj.address,
      country: proj.country,
      city: proj.city,
      delivery_date: proj.delivery_date,
      status: proj.status,
      launch_price: proj.launch_price,
      currency: proj.currency,
      unit_types: proj.unit_types,
      payment_plans: proj.payment_plans,
      photos: proj.photos,
      is_featured: proj.is_featured ?? false,
      location: {
        type: 'Point',
        coordinates: [proj.longitude, proj.latitude],
      },
    };

    const result = await Project.updateOne(
      { name: proj.name, developer: devId },
      {
        $set: set,
        $setOnInsert: {
          name: proj.name,
          views: 0,
        },
      },
      { upsert: true },
    );

    if (result.upsertedCount > 0) {
      inserted += 1;
      console.log(`  + ${proj.name} (${proj.developerName})`);
    } else if (result.modifiedCount > 0) {
      updated += 1;
      console.log(`  ~ ${proj.name} (${proj.developerName})`);
    } else {
      console.log(`  = ${proj.name} (${proj.developerName}) (unchanged)`);
    }
    touchedDevs.add(proj.developerName);
  }

  // Refresh projects_count for all developers we touched
  for (const name of touchedDevs) {
    const devId = devByName.get(name);
    if (!devId) continue;
    const count = await Project.countDocuments({ developer: devId });
    await Developer.updateOne({ _id: devId }, { $set: { projects_count: count } });
  }

  await mongoose.disconnect();
  console.log(
    `\nDone. ${inserted} inserted, ${updated} updated, ${skipped} skipped, total ${PROJECTS.length} project seeds processed.`,
  );
  console.log(`Refreshed projects_count for ${touchedDevs.size} developer(s).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
