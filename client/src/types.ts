export interface UserInputForm {
  skills: string;
  timeAvailability: string;
  riskAppetite: "low" | "medium" | "high";
  incomeGoals: number;
  workPreference: "remote" | "local" | "both";
  additionalDetails?: string;
  // Social networking options
  discoverable: boolean;
  allowMessages: boolean;
}

export enum OpportunityType {
  FREELANCE = "Freelance",
  DIGITAL_PRODUCT = "Digital Product",
  CONTENT = "Content Creation",
  SERVICE = "Service-Based",
  PASSIVE = "Passive Income",
  INFO_PRODUCT = "Info Product"
}

export enum RiskLevel {
  LOW = "Low",
  MEDIUM = "Medium",
  HIGH = "High"
}

export interface Resource {
  title: string;
  url: string;
  source: string;
}

export interface SuccessStory {
  name: string;  
  background: string;
  journey: string;
  outcome: string;
  profileUrl?: string;
  imageUrl?: string;
}

export interface MonetizationOpportunity {
  id: string;
  title: string;
  type: OpportunityType;
  icon: string;
  description: string;
  incomePotential: string;
  startupCost: string;
  riskLevel: RiskLevel;
  stepsToStart: string[];
  resources: Resource[];
  successStories?: SuccessStory[];
}

export interface MonetizationResults {
  opportunities: MonetizationOpportunity[];
  userProfile: {
    skills: string[];
    timeAvailability: string;
    incomeGoals: number;
    riskTolerance: string;
    preference: string;
  };
  similarUsers?: UserMatch[];
}

export interface UserProfile {
  id: number;
  username: string;
  displayName?: string;
  profilePicture?: string;
  bio?: string;
  skills: string[];
  timeAvailability?: string;
  discoverable: boolean;
  allowMessages: boolean;
}

export interface UserMatch {
  user: UserProfile;
  matchScore: number; // 0-100 score showing how closely skills match
  matchedSkills: string[];
  commonInterests?: string[];
}

export interface Message {
  id: number;
  senderId: number;
  recipientId: number;
  senderName: string;
  subject?: string;
  content: string;
  isRead: boolean;
  sentAt: string;
  readAt?: string;
}

export interface Connection {
  id: number;
  requesterId: number;
  recipientId: number;
  requesterName: string;
  recipientName: string;
  status: 'pending' | 'accepted' | 'rejected' | 'blocked';
  createdAt: string;
}
