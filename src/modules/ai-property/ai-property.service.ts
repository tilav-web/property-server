import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { OpenaiService } from '../openai/openai.service';
import {
  Property,
  PropertyDocument,
} from '../property/schemas/property.schema';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import { EnumPropertyCategory } from '../property/enums/property-category.enum';
import { EnumRepairType } from '../property/enums/repair-type.enum';
import { EnumHeating } from '../property/enums/heating.enum';
import { EnumAmenities } from '../../enums/amenities.enum';
import { EnumPropertyCurrency } from '../../enums/property-currency.enum';

@Injectable()
export class AiPropertyService {
  private readonly logger = new Logger(AiPropertyService.name);

  // Schema va Enum ma'lumotlari AI prompti uchun
  private readonly PROPERTY_SCHEMA_DEFINITION = {
    _id: 'string (ObjectId)',
    author: 'string (ObjectId)',
    title: '{ en: string, ru: string, uz: string }',
    description: '{ en: string, ru: string, uz: string }',
    address: '{ en: string, ru: string, uz: string }',
    category: `EnumPropertyCategory (e.g., "${EnumPropertyCategory.APARTMENT_SALE}")`,
    location:
      "{ type: 'Point', coordinates: [longitude: number, latitude: number] }",
    currency: `EnumPropertyCurrency (e.g., "${EnumPropertyCurrency.UZS}")`,
    price: 'number',
    is_premium: 'boolean',
    is_verified: 'boolean',
    rating: 'number',
    liked: 'number',
    saved: 'number',
    photos: 'string[]',
    videos: 'string[]',
    createdAt: 'Date',
    updatedAt: 'Date',
  };

  private readonly APARTMENT_SALE_SCHEMA_DEFINITION = {
    // Property schemadan meros bo'ladi
    bedrooms: 'number (Xonalar soni)',
    bathrooms: 'number (Hammomlar soni)',
    floor_level: 'number (Qaysi qavatda joylashgan)',
    total_floors: 'number (Binodagi umumiy qavatlar soni)',
    area: 'number (Kvadrat metr, maydon)',
    balcony: 'boolean (Balkon borligi)',
    furnished: 'boolean (Mebelli jihozlanganmi)',
    repair_type: `EnumRepairType (e.g., "${EnumRepairType.NEW}")`,
    heating: `EnumHeating (e.g., "${EnumHeating.CENTRAL}")`,
    air_conditioning: 'boolean (Konditsioner borligi)',
    parking: 'boolean (Avtoturargoh mavjudligi)',
    elevator: 'boolean (Lift mavjudligi)',
    amenities: `EnumAmenities[] (e.g., ["${EnumAmenities.POOL}"])`,
    mortgage_available: 'boolean (Ipoteka orqali sotish mumkinmi)',
  };

  private readonly APARTMENT_RENT_SCHEMA_DEFINITION = {
    // Property schemadan meros bo'ladi
    bedrooms: 'number (Xonalar soni)',
    bathrooms: 'number (Hammomlar soni)',
    floor_level: 'number (Qaysi qavatda joylashgan)',
    total_floors: 'number (Binodagi umumiy qavatlar soni)',
    area: 'number (Kvadrat metr, maydon)',
    balcony: 'boolean (Balkon borligi)',
    furnished: 'boolean (Mebelli jihozlanganmi)',
    repair_type: `EnumRepairType (e.g., "${EnumRepairType.NEW}")`,
    heating: `EnumHeating (e.g., "${EnumHeating.CENTRAL}")`,
    air_conditioning: 'boolean (Konditsioner borligi)',
    parking: 'boolean (Avtoturargoh mavjudligi)',
    elevator: 'boolean (Lift mavjudligi)',
    amenities: `EnumAmenities[] (e.g., ["${EnumAmenities.POOL}"])`,
    contract_duration_months: 'number (Kontrakt muddati (oylar))',
  };

  private readonly ENUM_DEFINITIONS = {
    EnumPropertyCategory: Object.values(EnumPropertyCategory),
    EnumRepairType: Object.values(EnumRepairType),
    EnumHeating: Object.values(EnumHeating),
    EnumAmenities: Object.values(EnumAmenities),
    EnumPropertyCurrency: Object.values(EnumPropertyCurrency),
  };

  constructor(
    private readonly openaiService: OpenaiService,
    @InjectModel(Property.name)
    private readonly propertyModel: Model<PropertyDocument>,
  ) {}

  async findByPrompt(
    userPrompt: string,
    page: number = 1,
    limit: number = 5,
  ): Promise<{
    totalItems: number;
    totalPages: number;
    page: number;
    limit: number;
    properties: PropertyDocument[];
  }> {
    const aiPrompt = `Your task is to convert a user's natural language property search request into a MongoDB Mongoose FilterQuery JSON object.

The base "Property" schema available for searching is as follows:
${JSON.stringify(this.PROPERTY_SCHEMA_DEFINITION, null, 2)}

The "Property" schema is extended via the "category" field. There are currently two main categories:

1.  Additional fields for the "APARTMENT_SALE" category (Apartment for Sale):
${JSON.stringify(this.APARTMENT_SALE_SCHEMA_DEFINITION, null, 2)}

2.  Additional fields for the "APARTMENT_RENT" category (Apartment for Rent):
${JSON.stringify(this.APARTMENT_RENT_SCHEMA_DEFINITION, null, 2)}

Enums and their possible values used:
${JSON.stringify(this.ENUM_DEFINITIONS, null, 2)}

Create the JSON object based on the following rules:
-   **The output MUST be only and exclusively a valid Mongoose FilterQuery JSON object.** No other text, comments, or explanations should be included.
-   If the user uses terms like "apartment for sale" or similar in their search, set the "category" field to "APARTMENT_SALE".
-   If the user uses terms like "apartment for rent" or similar in their search, set the "category" field to "APARTMENT_RENT". If the category is not clearly specified, do not include it.
-   For location-related keywords (e.g., "Yunusobod district", "Tashkent city"), search them in the "address.uz", "title.uz", or "description.uz" fields using the "$regex" operator with the "i" option. Example: \`{"address.uz": { "$regex": "Yunusobod", "$options": "i" }}\`
-   For price ranges (e.g., "up to 50000 dollars", "above 10000 dollars"), use the \`$gte\` (greater than or equal to) and \`$lte\` (less than or equal to) operators.
-   If the user specifies currency (e.g., "dollar", "soum"), set the "currency" field to the corresponding \`EnumPropertyCurrency\` value. If currency is not specified, assume UZS as default.
-   For boolean fields (e.g., "furnished", "balcony", "mortgage_available"), use \`true\` or \`false\` values according to the user's request.
-   For enum fields (e.g., "repair_type", "heating", "amenities"), use the exact enum values.
-   When translating user input to query conditions, prioritize matching terms to the '.uz' localized fields (e.g., 'address.uz', 'title.uz', 'description.uz').

User's request: "${userPrompt}"

Mongoose FilterQuery JSON object:`;

    let query: FilterQuery<PropertyDocument>;
    try {
      const aiResponse = await this.openaiService.generateText(aiPrompt);

      const cleanedResponse = aiResponse.replace(/```json\n|\n```/g, '');
      query = JSON.parse(cleanedResponse);
      if (typeof query !== 'object' || query === null) {
        throw new Error('AI returned invalid JSON object type.');
      }
    } catch (error) {
      this.logger.error(`Error generating or parsing AI query: ${error}`);
      throw new InternalServerErrorException(
        'AI failed to generate a valid property search query. Please try rephrasing your request.',
      );
    }

    if (!query.status) {
      query.status = 'APPROVED';
    }

    const skip = (page - 1) * limit;

    try {
      const [properties, totalItems] = await Promise.all([
        this.propertyModel.find(query).skip(skip).limit(limit).exec(),
        this.propertyModel.countDocuments(query),
      ]);

      const totalPages = Math.ceil(totalItems / limit);

      return {
        totalItems,
        totalPages,
        page,
        limit,
        properties,
      };
    } catch (error) {
      this.logger.error(`Error executing Mongoose query: ${error}`);
      throw new InternalServerErrorException(
        'Failed to execute property search query. Please check the generated query or try again.',
      );
    }
  }
}
