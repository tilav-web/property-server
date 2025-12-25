import { Property } from 'src/modules/property/schemas/property.schema';
import { User } from 'src/modules/user/user.schema';
import { Save } from 'src/modules/interactions/schemas/save.schema';
import { Like } from 'src/modules/interactions/schemas/like.schema';
// Removed unused import: import { Types } from 'mongoose';

// Interface for Property with populated Author (excluding password)
export interface PropertyWithAuthorAggregation extends Omit<Property, 'author'> {
  author: Omit<User, 'password'>;
}

// Interface for Save document with populated Property and Author
export interface SaveWithPropertyAndAuthorAggregation extends Omit<Save, 'property'> {
  property: PropertyWithAuthorAggregation;
}

// Interface for Like document with populated Property and Author
export interface LikeWithPropertyAndAuthorAggregation extends Omit<Like, 'property'> {
  property: PropertyWithAuthorAggregation;
}
