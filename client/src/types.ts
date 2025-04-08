export interface UserInputForm {
  skills: string;
  timeAvailability: string;
  riskAppetite: "low" | "medium" | "high";
  incomeGoals: number;
  workPreference: "remote" | "local" | "both";
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
}
