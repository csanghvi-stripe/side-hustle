import { OpportunityType, RiskLevel } from "../../shared/schema";

// Base raw opportunity interface
// Success story interface for detailed stories
export interface SuccessStoryDetail {
  name: string;
  background: string;
  journey: string;
  outcome: string;
}

export interface RawOpportunity {
  id: string;
  title: string;
  description: string;
  url?: string;
  platform?: string;
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
    timeframe?: string; // Default is "weekly"
  };
  entryBarrier: RiskLevel;
  stepsToStart: string[];
  resourceLinks?: string[]; // Links to resources (URLs)
  resources?: { title: string, url: string }[];
  successStories?: (string | SuccessStoryDetail)[];
  matchScore?: number; // Added during matching process
  location?: string; // Optional location information
  competition?: string; // Competition level information
  skillsRequired?: string[]; // Alternative property name for skills
  sourceName?: string; // Name of the source that provided this opportunity
  marketDemand?: string; // Market demand level
  skillGapDays?: number; // Days needed to learn required skills
  timeToFirstRevenue?: string; // Estimated time to first revenue
  roiScore?: number; // Return on investment score
  source?: string; // Source of the opportunity
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
  useML?: boolean;
  useSkillGapAnalysis?: boolean;
  includeROI?: boolean;
  userId?: number;
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
  mlEnabled?: boolean;
  skillGapAnalysisEnabled?: boolean;
}

// User input for discovery process
export interface UserDiscoveryInput {
  userId?: number;
  skills: string[];
  timeAvailability: string;
  riskAppetite: string;
  riskTolerance?: string; // Alternative name for riskAppetite
  incomeGoals: number;
  workPreference?: string;
  additionalDetails?: string;
  discoverable?: boolean;
  useEnhanced?: boolean;
  preferences?: DiscoveryPreferences; // Added for compatibility with getOpportunities
}

// Added structure for success stories
export interface SuccessStory {
  username: string;
  shortStory: string;
  income: number;
  timeframe: string;
  daysToFirstDollar: number;
}

// Added structure for learning resources
export interface Resource {
  title: string;
  url: string;
  type: 'article' | 'video' | 'course' | 'tool' | 'other';
  isPaid?: boolean;
  free?: boolean; // Alternative name for isPaid (inverse logic)
  price?: number;
  duration?: string;
  source?: string;
  description?: string;
}

// Enhanced opportunity with more details
export interface EnrichedOpportunity extends Omit<RawOpportunity, 'resourceLinks' | 'successStories'> {
  successStories: SuccessStory[];
  resources: Resource[];
  resourceLinks?: string[]; // Optional backward compatibility
  skillGaps: string[];
  learningPaths: string[];
  completionTimeEstimate: string;
  timeToFirstDollar: string;
  category: OpportunityCategory;
}

// Interface for opportunity sources with extended properties
export interface OpportunitySource {
  name: string;
  id: string;
  description: string;
  capabilities: string[];
  isEnabled: boolean;
  getOpportunities(skills: string[], preferences: DiscoveryPreferences): Promise<RawOpportunity[]>;
  handleError?: (error: any, context?: string) => void;
  fetchOpportunities?(input: UserDiscoveryInput): Promise<RawOpportunity[]>;
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