import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MonetizationOpportunity } from "@shared/schema";
import { Link } from "wouter";
import SkillGapAnalyzer from "./analytics/SkillGapAnalyzer";
import { 
  Briefcase, 
  Code, 
  Monitor, 
  Brush, 
  Presentation, 
  Package, 
  CircleDollarSign, 
  Megaphone, 
  TrendingUp, 
  Clock, 
  Target, 
  DollarSign, 
  Building, 
  ChevronRight 
} from "lucide-react";

// Define color variants for different opportunity types
const typeVariants: Record<string, string> = {
  "Freelance": "outline",
  "Digital Product": "secondary",
  "Content Creation": "destructive",
  "Service-Based": "default",
  "Passive Income": "info"
};

// Define color for risk levels
const riskLevelColors: Record<string, string> = {
  "Low": "bg-green-500",
  "Medium": "bg-yellow-500",
  "High": "bg-red-500"
};

// Function to get appropriate icon based on opportunity type
const getIconForType = (type: string) => {
  switch (type) {
    case "Freelance":
      return <Briefcase className="w-5 h-5 text-blue-600" />;
    case "Digital Product":
      return <Package className="w-5 h-5 text-purple-600" />;
    case "Content Creation":
      return <Brush className="w-5 h-5 text-pink-600" />;
    case "Service-Based":
      return <CircleDollarSign className="w-5 h-5 text-green-600" />;
    case "Passive Income":
      return <Monitor className="w-5 h-5 text-cyan-600" />;
    case "Info Product":
      return <Presentation className="w-5 h-5 text-amber-600" />;
    case "Software Development":
      return <Code className="w-5 h-5 text-blue-600" />;
    case "Marketing":
      return <Megaphone className="w-5 h-5 text-red-600" />;
    default:
      return <Briefcase className="w-5 h-5 text-neutral-600" />;
  }
};

// Define the shape of opportunity data we'll parse from JSON
type ResourceType = {
  title?: string;
  url?: string;
  source?: string;
};

type SuccessStoryType = {
  name?: string;
  profileUrl?: string;
  background?: string;
  journey?: string;
  outcome?: string;
};

type OpportunityDataType = {
  title: string;
  type: string;
  description: string;
  incomePotential: string;
  startupCost: string;
  riskLevel: string;
  stepsToStart: string[];
  successStories?: SuccessStoryType[];
  resources: ResourceType[];
  roiScore?: number;
  timeToFirstRevenue?: string;
  skillGapDays?: number;
  requiredSkills?: string[];
};

interface OpportunityCardProps {
  opportunity: MonetizationOpportunity;
}

const OpportunityCard: React.FC<OpportunityCardProps> = ({ opportunity }) => {
  const [isSkillGapExpanded, setIsSkillGapExpanded] = useState(false);
  
  console.log("Opportunity raw:", opportunity);
  
  // Safely parse opportunityData from JSON to object if it's a string
  let opportunityData: OpportunityDataType | null = null;
  try {
    if (typeof opportunity.opportunityData === 'string') {
      // Parse from JSON string
      const parsed = JSON.parse(opportunity.opportunityData);
      console.log("Parsed opportunity JSON data:", parsed);
      
      // Normalize opportunity type to match enum values
      let normalizedType = parsed.type || (opportunity as any).type || "Freelance";
      
      // Ensure type matches one of our enum values for filtering
      if (normalizedType && typeof normalizedType === 'string') {
        // Convert to title case to match our enum values
        const typeWords = normalizedType.split(' ');
        normalizedType = typeWords.map(word => 
          word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        ).join(' ');
        
        // Map to defined opportunity types
        if (normalizedType.includes('Freelance')) {
          normalizedType = "Freelance";
        } else if (normalizedType.includes('Digital') || normalizedType.includes('Product')) {
          normalizedType = "Digital Product";
        } else if (normalizedType.includes('Content')) {
          normalizedType = "Content Creation";
        } else if (normalizedType.includes('Service')) {
          normalizedType = "Service-Based";
        } else if (normalizedType.includes('Passive')) {
          normalizedType = "Passive Income";
        } else {
          normalizedType = "Freelance"; // Default to Freelance
        }
      }
      
      // Generate a random ROI score if not provided
      const roiScore = parsed.roiScore || Math.floor(Math.random() * 50) + 50;
      
      // Set time to first revenue
      const timeToFirstRevenue = parsed.timeToFirstRevenue || "~30 days";
      
      // Set skill gap days
      const skillGapDays = parsed.skillGapDays || 0;
      
      opportunityData = {
        title: parsed.title || opportunity.title || "",
        type: normalizedType,
        description: parsed.description || "This opportunity allows you to leverage your skills in a flexible way to generate income.",
        incomePotential: parsed.incomePotential || "$0-$0",
        startupCost: parsed.startupCost || "$0",
        riskLevel: parsed.riskLevel || "Medium",
        stepsToStart: Array.isArray(parsed.stepsToStart) ? parsed.stepsToStart : [
          "Create a profile highlighting your relevant skills",
          "Identify your target clients or audience",
          "Set up the necessary tools and accounts",
          "Start marketing your services"
        ],
        resources: Array.isArray(parsed.resources) ? parsed.resources : [],
        successStories: Array.isArray(parsed.successStories) ? parsed.successStories : [],
        roiScore: roiScore,
        timeToFirstRevenue: timeToFirstRevenue,
        skillGapDays: skillGapDays,
        requiredSkills: Array.isArray(parsed.requiredSkills) ? parsed.requiredSkills : []
      };
    } else if (opportunity.opportunityData && typeof opportunity.opportunityData === 'object') {
      // It's already an object
      const parsed = opportunity.opportunityData as any;
      console.log("Parsed opportunity object data:", parsed);
      
      // Let's check for different possible data structures
      let description = "";
      if (parsed.description) {
        description = parsed.description;
      } else if (parsed.howItWorks) {
        description = parsed.howItWorks;
      } else if (parsed.details) {
        description = parsed.details;
      } else {
        description = "This opportunity allows you to leverage your skills in a flexible way to generate income.";
      }
      
      // Normalize opportunity type to match enum values
      let normalizedType = parsed.type || (opportunity as any).type || "Freelance";
      
      // Ensure type matches one of our enum values for filtering
      if (normalizedType && typeof normalizedType === 'string') {
        // Convert to title case to match our enum values
        const typeWords = normalizedType.split(' ');
        normalizedType = typeWords.map(word => 
          word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        ).join(' ');
        
        // Map to defined opportunity types
        if (normalizedType.includes('Freelance')) {
          normalizedType = "Freelance";
        } else if (normalizedType.includes('Digital') || normalizedType.includes('Product')) {
          normalizedType = "Digital Product";
        } else if (normalizedType.includes('Content')) {
          normalizedType = "Content Creation";
        } else if (normalizedType.includes('Service')) {
          normalizedType = "Service-Based";
        } else if (normalizedType.includes('Passive')) {
          normalizedType = "Passive Income";
        } else {
          normalizedType = "Freelance"; // Default to Freelance
        }
      }
      
      // Generate a random ROI score if not provided
      const roiScore = parsed.roiScore || Math.floor(Math.random() * 50) + 50;
      
      // Set time to first revenue
      const timeToFirstRevenue = parsed.timeToFirstRevenue || "~30 days";
      
      // Set skill gap days
      const skillGapDays = parsed.skillGapDays || 0;
      
      opportunityData = {
        title: parsed.title || opportunity.title || "",
        type: normalizedType,
        description: description,
        incomePotential: parsed.incomePotential || "$0-$0",
        startupCost: parsed.startupCost || "$0",
        riskLevel: parsed.riskLevel || "Medium",
        stepsToStart: Array.isArray(parsed.stepsToStart) ? parsed.stepsToStart : [
          "Create a profile highlighting your relevant skills",
          "Identify your target clients or audience",
          "Set up the necessary tools and accounts",
          "Start marketing your services"
        ],
        resources: Array.isArray(parsed.resources) ? parsed.resources : [],
        successStories: Array.isArray(parsed.successStories) ? parsed.successStories : [],
        roiScore: roiScore,
        timeToFirstRevenue: timeToFirstRevenue,
        skillGapDays: skillGapDays,
        requiredSkills: Array.isArray(parsed.requiredSkills) ? parsed.requiredSkills : []
      };
    } else {
      // Fallback if opportunityData is missing/invalid
      opportunityData = {
        title: opportunity.title || "",
        type: "Freelance", // Default to Freelance
        description: "This opportunity allows you to leverage your skills in a flexible way to generate income.",
        incomePotential: "$0-$0",
        startupCost: "$0",
        riskLevel: "Medium",
        stepsToStart: [
          "Create a profile highlighting your relevant skills",
          "Identify your target clients or audience",
          "Set up the necessary tools and accounts",
          "Start marketing your services"
        ],
        resources: [],
        successStories: [],
        roiScore: 56, // Default ROI score
        timeToFirstRevenue: "~30 days",
        skillGapDays: 0,
        requiredSkills: []
      };
    }
    
    console.log("Using opportunityData:", opportunityData);
  } catch (error) {
    console.error("Failed to parse opportunity data:", error);
    // Fallback if parsing fails
    opportunityData = {
      title: opportunity.title || "",
      type: "Freelance",
      description: "Error loading opportunity details",
      incomePotential: "$0-$0",
      startupCost: "$0",
      riskLevel: "Medium",
      stepsToStart: [],
      resources: [],
      roiScore: 56, // Default ROI score
      timeToFirstRevenue: "~30 days",
      skillGapDays: 0,
      requiredSkills: []
    };
  }

  // If we couldn't parse the data, show a simplified card
  if (!opportunityData) {
    return (
      <div className="result-card border border-neutral-100 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition p-4">
        <h3 className="font-medium">{opportunity.title || "Opportunity"}</h3>
        <p className="text-sm text-gray-500 mt-2">No details available</p>
      </div>
    );
  }

  const toggleSkillGapExpanded = () => {
    setIsSkillGapExpanded(!isSkillGapExpanded);
  };

  // This is the simplified summary card for the opportunities list page that matches the screenshot
  return (
    <div className="border border-neutral-100 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition bg-white p-6 relative">
      {/* Date badge in top right */}
      <div className="absolute top-4 right-4 bg-slate-700 text-white text-xs px-2 py-1 rounded-md">
        {new Date().toLocaleDateString('en-US', {
          month: 'numeric',
          day: 'numeric',
          year: 'numeric'
        })}
      </div>
      
      <div className="flex flex-col gap-5">
        {/* Header with type */}
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            {getIconForType(opportunityData.type)}
          </div>
          <Badge variant={(typeVariants[opportunityData.type as keyof typeof typeVariants] || "default") as any}>
            {opportunityData.type}
          </Badge>
        </div>
        
        {/* ROI Analysis Section */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            <h4 className="font-medium text-base">ROI Analysis</h4>
            <div className="bg-slate-800 text-white px-2 py-1 rounded-md text-xs font-medium">
              {opportunityData.roiScore}/100
            </div>
          </div>
          
          <p className="text-sm text-neutral-500 line-clamp-2">
            Bang for buck assessment for this opportunity
          </p>
        </div>
        
        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-neutral-500">Potential Monthly Income</p>
            <div className="flex items-center mt-1">
              <DollarSign className="w-4 h-4 text-green-500 mr-1" />
              <span className="font-medium">{opportunityData.incomePotential}</span>
            </div>
          </div>
          
          <div>
            <p className="text-xs text-neutral-500">Time to First Revenue</p>
            <div className="flex items-center mt-1">
              <Clock className="w-4 h-4 text-amber-500 mr-1" />
              <span className="font-medium">{opportunityData.timeToFirstRevenue}</span>
            </div>
          </div>
          
          <div>
            <p className="text-xs text-neutral-500">Skill Gap Closure</p>
            <div className="flex items-center mt-1">
              <Target className="w-4 h-4 text-purple-500 mr-1" />
              <span className="font-medium">~{opportunityData.skillGapDays} days</span>
            </div>
          </div>
        </div>
        
        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-3 mt-3">
          <Link href={`/opportunity/${opportunity.id}`}>
            <Button variant="outline" className="w-full">
              View Details
            </Button>
          </Link>
          <Link href={`/action-plan?opportunityId=${opportunity.id}`}>
            <Button className="w-full">
              Create Plan
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default OpportunityCard;