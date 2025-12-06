export interface Client {
  id: string;
  name: string;
  email: string;
  notes?: string;
  createdAt: string;
  searches: SearchSessionSummary[];
}

export interface SearchSessionSummary {
  id: string;
  createdAt: string;
  preferredLocation: string;
  hasEmailSent: boolean;
  minPrice?: number;
  maxPrice?: number;
}

export interface SearchSession {
  id: string;
  clientId: string;
  createdAt: string;
  preferredLocation: string;
  clientNotes: string;
  zillowSearchUrl: string;
  minPrice?: number;
  maxPrice?: number;
  candidateCount: number;
  evaluatedProperties: EvaluatedProperty[];
  selectedPropertyIds?: string[];
  finalEmail?: FinalEmailRecord;
}

export interface EvaluatedProperty {
  id: string;
  zillowUrl: string;
  address: string;
  city: string;
  state: string;
  zipcode: string;
  photos?: string[];
  price: number;
  beds: number;
  baths: number;
  sqft?: number;
  lotSizeSqft?: number;
  daysOnMarket?: number;
  yearBuilt?: number;
  zestimate?: number;
  description?: string;
  nearbySchools?: {
    name?: string;
    rating?: number;
    grades?: string;
  }[];
  aiScore: number;
  aiPros: string[];
  aiCons: string[];
  aiRationale: string;
  rsapiRaw: unknown;
}

export interface FinalEmailRecord {
  to?: string;
  cc?: string[];
  subject: string;
  body: string;
  includedPropertyIds: string[];
  sentAt: string;
  messageId?: string;
}

export interface SanitizedPropertyDetails {
  streetAddress?: string;
  city?: string;
  state?: string;
  zipcode?: string;
  county?: string;
  yearBuilt?: number;
  bedrooms?: number;
  bathrooms?: number;
  livingArea_sqft?: number;
  lotSize_sqft?: number;
  zestimate?: number;
  annualTaxAmount?: number;
  taxAssessedValue?: number;
  lastSale?: { date?: string; price?: number } | string;
  pricePerSquareFoot?: number;
  daysOnZillow?: number;
  photos?: string[];
  nearbySchools?: {
    name?: string;
    rating?: number;
    grades?: string;
  }[];
  description?: string;
  heating?: string;
  cooling?: string;
  parkingCapacity?: number;
  zillowUrl?: string;
  price?: number;
}
