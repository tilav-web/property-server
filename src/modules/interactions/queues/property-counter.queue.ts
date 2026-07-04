export const PROPERTY_COUNTER_QUEUE = 'property-counters';

export interface PropertyCounterJob {
  propertyId: string;
  field: 'liked' | 'saved';
  delta: number;
}
