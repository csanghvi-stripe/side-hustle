import { OpportunityType, RiskLevel } from "../../shared/schema";

// Base raw opportunity interface
export interface RawOpportunity {
  id: string;
  title: string;
  description: string;
  url: string;
  platform: string;
  type: OpportunityType;
  requiredSkills: string[];
  niceToHaveSkills?: string[];
  estimatedIncome: {
    min: number;
    max: number;
    timeframe: string; // "hour", "day", "week", "month", "year" or "project"
  };
  startupCost: {
    min: number;
    max: number;
  };
  timeRequired: {
    min: number; // Hours per week
    max: number;
  };
  entryBarrier: RiskLevel;
  stepsToStart: string[];
  resources: string[];
  successStories?: string[];
  matchScore?: number; // Added during matching process
}

// User preferences for opportunity discovery
export interface DiscoveryPreferences {
  skills: string[];
  timeAvailability: string;
  riskAppetite: string;
  incomeGoals: number;
  workPreference?: string;
  additionalDetails?: string;
  discoverable?: boolean;
  allowMessages?: boolean;
  useEnhanced?: boolean;
}

// Interface for similar/compatible users
export interface SimilarUser {
  id: number;
  username: string;
  skills: string[];
  similarity: number; // 0-1 score of how similar user is
  sharedOpportunities?: number; // Count of opportunities they've shared
}

// Results returned from discovery engine
export interface DiscoveryResults {
  opportunities: RawOpportunity[];
  similarUsers: SimilarUser[];
  enhanced: boolean;
}

// Interface for opportunity sources
export interface OpportunitySource {
  name: string;
  id: string;
  getOpportunities(skills: string[], preferences: DiscoveryPreferences): Promise<RawOpportunity[]>;
}

// Classification of opportunity types
export enum OpportunityCategory {
  QUICK_WIN = "QUICK_WIN",
  GROWTH = "GROWTH",
  ASPIRATIONAL = "ASPIRATIONAL",
  PASSIVE = "PASSIVE"
}

// Cache entry type
export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}