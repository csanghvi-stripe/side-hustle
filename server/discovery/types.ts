/**
 * Monetization Discovery Engine Types
 * Core types and interfaces for the opportunity discovery algorithm
 */

import { OpportunityType, RiskLevel } from "../../shared/schema";

/**
 * User input for the monetization discovery algorithm
 */
export interface UserDiscoveryInput {
  userId: number;        // ID of the user making the request
  skills: string[];      // Array of user's skills
  timeAvailability: string; // Descriptive time availability (e.g., "10 hours/week")
  incomeGoals: number;   // Target monthly income in dollars
  riskTolerance: "low" | "medium" | "high"; // User's risk appetite
  workPreference: "remote" | "local" | "both"; // Preference for work location
  additionalDetails?: string; // Optional free-text input for additional context
  // Social networking preferences
  discoverable?: boolean; // Whether user wants to be discoverable by others
  allowMessages?: boolean; // Whether user allows messages from others
  // Algorithm options  
  useEnhanced?: boolean; // Whether to use the enhanced algorithm (may require credits)
}

/**
 * Base source platform for opportunity discovery
 */
export interface OpportunitySource {
  id: string;            // Unique identifier for the source
  name: string;          // Display name of the source
  url: string;           // Base URL for the platform
  type: OpportunityType; // Type of opportunities provided by this source
  logo?: string;         // URL or path to the source's logo
  apiKey?: string;       // API key if required (securely stored)
  active: boolean;       // Whether this source is currently active
  
  // Main method to fetch opportunities based on user skills
  fetchOpportunities(input: UserDiscoveryInput): Promise<RawOpportunity[]>;
}

/**
 * Raw opportunity data fetched from a source
 */
export interface RawOpportunity {
  sourceId: string;      // ID of the source platform
  sourceName: string;    // Name of the source platform
  externalId?: string;   // ID on the original platform if available
  url?: string;          // URL to the opportunity if applicable
  
  title: string;         // Title of the opportunity
  description: string;   // Description of the opportunity
  imageUrl?: string;     // Image representing the opportunity
  type: OpportunityType; // Type categorization
  
  skillsRequired: string[]; // Skills required for this opportunity
  
  estimatedIncome: {
    min: number;
    max: number;
    timeframe: "hourly" | "monthly" | "per-project" | "annual";
  };
  
  startupCost: {
    min: number;
    max: number;
  };
  
  timeCommitment: {
    min: number; // Hours
    max: number; // Hours
    timeframe: "daily" | "weekly" | "monthly";
  };
  
  location: "remote" | "local" | "both";
  entryBarrier: RiskLevel;
  competition: "low" | "medium" | "high";
  growth: "stable" | "growing" | "declining";
  
  // Raw data from the source, format may vary
  rawData?: any;
}

/**
 * Enriched opportunity with additional contextual data
 */
export interface EnrichedOpportunity extends RawOpportunity {
  id: string;            // Unique ID for this opportunity
  matchScore: number;    // 0-100 score indicating match with user's skills
  timeToFirstDollar: number; // Estimated days to first earning
  
  // User-specific contextualization
  skillMatchDetails: {
    matched: string[];   // User skills that match this opportunity
    missing: string[];   // Required skills user doesn't have
    related: string[];   // Related skills that would be helpful
  };
  
  // Enhanced content
  successStories: SuccessStory[];
  stepsToStart: string[];
  resources: Resource[];
  skillGapResources?: Resource[]; // Resources specific to skill gaps
  
  // Categorization data
  categories: {
    primary: string;     // Primary category (e.g., "Quick Win")
    secondary?: string;  // Optional secondary category
  };
  
  // Related opportunities
  related?: string[];    // IDs of related opportunities
}

/**
 * Success story for an opportunity
 */
export interface SuccessStory {
  name: string;          // Name of the person or business
  background: string;    // Background/context
  journey: string;       // Their journey with this opportunity
  outcome: string;       // Outcome of their journey
  timeframe?: string;    // Timeframe of their journey
  income?: string;       // Income achieved if disclosed
  profileUrl?: string;   // Link to their profile if available
  imageUrl?: string;     // Image URL if available
}

/**
 * Resource for learning or getting started
 */
export interface Resource {
  title: string;         // Title of the resource
  description?: string;  // Description of the resource
  url: string;           // URL to the resource
  type: "article" | "video" | "course" | "tool" | "template" | "community" | "other";
  free: boolean;         // Whether the resource is free
  cost?: number;         // Cost if not free
  duration?: string;     // Time commitment (e.g., "2 hours", "4 weeks")
  source: string;        // Source of the resource
  imageUrl?: string;     // Image URL if applicable
}

/**
 * Results from the monetization discovery algorithm
 */
export interface DiscoveryResults {
  requestId: string;      // Unique ID for this discovery request
  userId: number;         // ID of the user who made the request
  timestamp: Date;        // When the discovery was performed
  
  // Input summary
  userInput: {
    skills: string[];
    timeAvailability: string;
    incomeGoals: number;
    riskTolerance: string;
    workPreference: string;
  };
  
  // Results
  opportunities: EnrichedOpportunity[];
  categories: {
    [key: string]: string[]; // Category name to opportunity IDs
  };
  
  // Metrics and metadata
  metrics: {
    sourcesSearched: number;
    totalOpportunitiesFound: number;
    matchThreshold: number;
    processingTimeMs: number;
  };
  
  // Optional social features
  similarUsers?: {
    userId: number;
    username: string;
    matchScore: number;
    matchedSkills: string[];
  }[];
  
  // Flag for enhanced results
  enhanced: boolean;
}