import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MonetizationOpportunity, OpportunityType } from "@shared/schema";
import { Link } from "wouter";
import SkillGapAnalyzer from "./analytics/SkillGapAnalyzer";
import { normalizeOpportunityType } from "@/utils/opportunity-helpers";
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
  ChevronRight,
  Trash2,
  HelpCircle,
  Info,
  ArrowRight,
  Shapes,
  PenTool,
  Laptop,
  ScrollText,
  Users,
  BookOpen,
} from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// Helper function to generate realistic metrics for opportunities
const calculateOpportunityMetrics = (
  type: string,
  requiredSkills?: string[],
) => {
  // Generate a more accurate ROI score
  let roiScore = 0;
  if (type === "Freelance") {
    roiScore = Math.floor(Math.random() * 10) + 65; // 65-75
  } else if (type === "Digital Product") {
    roiScore = Math.floor(Math.random() * 20) + 70; // 70-90
  } else if (type === "Content Creation") {
    roiScore = Math.floor(Math.random() * 15) + 60; // 60-75
  } else if (type === "Service-Based") {
    roiScore = Math.floor(Math.random() * 10) + 70; // 70-80
  } else if (type === "Passive Income") {
    roiScore = Math.floor(Math.random() * 25) + 55; // 55-80
  } else {
    roiScore = Math.floor(Math.random() * 20) + 60; // 60-80
  }

  // Generate realistic time to first revenue
  let timeToFirstRevenue = "";
  if (type === "Freelance") {
    timeToFirstRevenue = "2-4 weeks";
  } else if (type === "Digital Product") {
    timeToFirstRevenue = "1-3 months";
  } else if (type === "Content Creation") {
    timeToFirstRevenue = "2-6 weeks";
  } else if (type === "Service-Based") {
    timeToFirstRevenue = "1-2 weeks";
  } else if (type === "Passive Income") {
    timeToFirstRevenue = "3-6 months";
  } else {
    timeToFirstRevenue = "~30 days";
  }

  // Calculate skill gap days
  let skillGapDays = 0;
  if (Array.isArray(requiredSkills) && requiredSkills.length > 0) {
    // More skills = more days to learn
    skillGapDays = requiredSkills.length * 3 + 2;
  } else {
    // Default values based on opportunity type
    if (type === "Freelance") {
      skillGapDays = 7;
    } else if (type === "Digital Product") {
      skillGapDays = 21;
    } else if (type === "Content Creation") {
      skillGapDays = 14;
    } else if (type === "Service-Based") {
      skillGapDays = 10;
    } else if (type === "Passive Income") {
      skillGapDays = 30;
    } else {
      skillGapDays = 14;
    }
  }

  // Generate realistic income potential
  let incomePotential = "";
  if (type === "Freelance") {
    incomePotential = "$1,000-$5,000";
  } else if (type === "Digital Product") {
    incomePotential = "$500-$10,000";
  } else if (type === "Content Creation") {
    incomePotential = "$500-$3,000";
  } else if (type === "Service-Based") {
    incomePotential = "$1,500-$8,000";
  } else if (type === "Passive Income") {
    incomePotential = "$200-$2,000";
  } else {
    incomePotential = "$1,000-$3,000";
  }

  // Generate startup cost
  let startupCost = "";
  if (type === "Freelance") {
    startupCost = "$0-$100";
  } else if (type === "Digital Product") {
    startupCost = "$100-$1,000";
  } else if (type === "Content Creation") {
    startupCost = "$50-$500";
  } else if (type === "Service-Based") {
    startupCost = "$100-$500";
  } else if (type === "Passive Income") {
    startupCost = "$500-$5,000";
  } else {
    startupCost = "$50-$500";
  }

  return {
    roiScore,
    timeToFirstRevenue,
    skillGapDays,
    incomePotential,
    startupCost,
  };
};

// Define color variants for different opportunity types
const typeVariants: Record<string, string> = {
  Freelance: "outline",
  "Digital Product": "secondary",
  "Content Creation": "destructive",
  "Service-Based": "default",
  "Passive Income": "info",
};

// Define color for risk levels
const riskLevelColors: Record<string, string> = {
  Low: "bg-green-500",
  Medium: "bg-yellow-500",
  High: "bg-red-500",
};

// Function to get appropriate icon based on opportunity type
const getIconForType = (type: string) => {
  // Normalize the type first
  const normalizedDisplayType = normalizeOpportunityType(type);
  
  // Return icon based on normalized display type
  if (normalizedDisplayType === "Freelance") {
    return <Briefcase className="w-5 h-5 text-blue-600" />;
  } else if (normalizedDisplayType === "Digital Product") {
    return <Package className="w-5 h-5 text-purple-600" />;
  } else if (normalizedDisplayType === "Content Creation") {
    return <Brush className="w-5 h-5 text-pink-600" />;
  } else if (normalizedDisplayType === "Service-Based") {
    return <CircleDollarSign className="w-5 h-5 text-green-600" />;
  } else if (normalizedDisplayType === "Passive Income") {
    return <Monitor className="w-5 h-5 text-cyan-600" />;
  } else if (normalizedDisplayType === "Info Product") {
    return <Presentation className="w-5 h-5 text-amber-600" />;
  } else {
    // Default case
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
  source?: 'search' | 'saved'; // Indicates where this card is being displayed
}

const OpportunityCard: React.FC<OpportunityCardProps> = ({ opportunity, source = 'search' }) => {
  const [isSkillGapExpanded, setIsSkillGapExpanded] = useState(false);
  const { toast } = useToast();

  // Set up delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (opportunityId: number) => {
      return await apiRequest("DELETE", `/api/opportunities/${opportunityId}`);
    },
    onSuccess: () => {
      // Invalidate and refetch opportunities
      queryClient.invalidateQueries({ queryKey: ["/api/opportunities"] });
      toast({
        title: "Opportunity deleted",
        description: "The opportunity has been successfully removed.",
      });
    },
    onError: (error) => {
      console.error("Error deleting opportunity:", error);
      toast({
        title: "Delete failed",
        description: "Failed to delete the opportunity. Please try again.",
        variant: "destructive",
      });
    },
  });

  console.log("Opportunity raw:", opportunity);

  // Safely parse opportunityData from JSON to object if it's a string
  let opportunityData: OpportunityDataType | null = null;
  try {
    if (typeof opportunity.opportunityData === "string") {
      // Parse from JSON string
      const parsed = JSON.parse(opportunity.opportunityData);
      console.log("Parsed opportunity JSON data:", parsed);

      // Use our helper function to normalize the opportunity type
      let normalizedType = normalizeOpportunityType(
        parsed.type || (opportunity as any).type
      );

      // Use metrics helper for more accurate values
      const metrics = calculateOpportunityMetrics(
        normalizedType,
        Array.isArray(parsed.requiredSkills) ? parsed.requiredSkills : [],
      );

      const roiScore = parsed.roiScore || metrics.roiScore;
      const timeToFirstRevenue =
        parsed.timeToFirstRevenue || metrics.timeToFirstRevenue;
      const skillGapDays =
        parsed.skillGapDays !== undefined
          ? parsed.skillGapDays
          : metrics.skillGapDays;

      opportunityData = {
        title: parsed.title || opportunity.title || "",
        type: normalizedType,
        description:
          parsed.description ||
          "This opportunity allows you to leverage your skills in a flexible way to generate income.",
        incomePotential: parsed.incomePotential || metrics.incomePotential,
        startupCost: parsed.startupCost || metrics.startupCost,
        riskLevel: parsed.riskLevel || "Medium",
        stepsToStart: Array.isArray(parsed.stepsToStart)
          ? parsed.stepsToStart
          : [
              "Create a profile highlighting your relevant skills",
              "Identify your target clients or audience",
              "Set up the necessary tools and accounts",
              "Start marketing your services",
            ],
        resources: Array.isArray(parsed.resources) ? parsed.resources : [],
        successStories: Array.isArray(parsed.successStories)
          ? parsed.successStories
          : [],
        roiScore: roiScore,
        timeToFirstRevenue: timeToFirstRevenue,
        skillGapDays: skillGapDays,
        requiredSkills: Array.isArray(parsed.requiredSkills)
          ? parsed.requiredSkills
          : [],
      };
    } else if (
      opportunity.opportunityData &&
      typeof opportunity.opportunityData === "object"
    ) {
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
        description =
          "This opportunity allows you to leverage your skills in a flexible way to generate income.";
      }

      // Use our helper function to normalize the opportunity type
      let normalizedType = normalizeOpportunityType(
        parsed.type || (opportunity as any).type
      );

      // Use metrics helper for more accurate values
      const secondMetrics = calculateOpportunityMetrics(
        normalizedType,
        Array.isArray(parsed.requiredSkills) ? parsed.requiredSkills : [],
      );

      const roiScore = parsed.roiScore || secondMetrics.roiScore;
      const timeToFirstRevenue =
        parsed.timeToFirstRevenue || secondMetrics.timeToFirstRevenue;
      const skillGapDays =
        parsed.skillGapDays !== undefined
          ? parsed.skillGapDays
          : secondMetrics.skillGapDays;

      opportunityData = {
        title: parsed.title || opportunity.title || "",
        type: normalizedType,
        description: description,
        incomePotential:
          parsed.incomePotential || secondMetrics.incomePotential,
        startupCost: parsed.startupCost || secondMetrics.startupCost,
        riskLevel: parsed.riskLevel || "Medium",
        stepsToStart: Array.isArray(parsed.stepsToStart)
          ? parsed.stepsToStart
          : [
              "Create a profile highlighting your relevant skills",
              "Identify your target clients or audience",
              "Set up the necessary tools and accounts",
              "Start marketing your services",
            ],
        resources: Array.isArray(parsed.resources) ? parsed.resources : [],
        successStories: Array.isArray(parsed.successStories)
          ? parsed.successStories
          : [],
        roiScore: roiScore,
        timeToFirstRevenue: timeToFirstRevenue,
        skillGapDays: skillGapDays,
        requiredSkills: Array.isArray(parsed.requiredSkills)
          ? parsed.requiredSkills
          : [],
      };
    } else {
      // Fallback if opportunityData is missing/invalid
      const fallbackMetrics = calculateOpportunityMetrics("Freelance");

      opportunityData = {
        title: opportunity.title || "",
        type: "Freelance", // Default to Freelance
        description:
          "This opportunity allows you to leverage your skills in a flexible way to generate income.",
        incomePotential: fallbackMetrics.incomePotential,
        startupCost: fallbackMetrics.startupCost,
        riskLevel: "Medium",
        stepsToStart: [
          "Create a profile highlighting your relevant skills",
          "Identify your target clients or audience",
          "Set up the necessary tools and accounts",
          "Start marketing your services",
        ],
        resources: [],
        successStories: [],
        roiScore: fallbackMetrics.roiScore,
        timeToFirstRevenue: fallbackMetrics.timeToFirstRevenue,
        skillGapDays: fallbackMetrics.skillGapDays,
        requiredSkills: [],
      };
    }

    console.log("Using opportunityData:", opportunityData);
  } catch (error) {
    console.error("Failed to parse opportunity data:", error);
    // Fallback if parsing fails
    const errorFallbackMetrics = calculateOpportunityMetrics("Freelance");

    opportunityData = {
      title: opportunity.title || "",
      type: "Freelance",
      description: "Error loading opportunity details",
      incomePotential: errorFallbackMetrics.incomePotential,
      startupCost: errorFallbackMetrics.startupCost,
      riskLevel: "Medium",
      stepsToStart: [],
      resources: [],
      roiScore: errorFallbackMetrics.roiScore,
      timeToFirstRevenue: errorFallbackMetrics.timeToFirstRevenue,
      skillGapDays: errorFallbackMetrics.skillGapDays,
      requiredSkills: [],
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

  // This is the improved card design that matches the inspire-page
  const normalizedRiskLevel = typeof opportunityData.riskLevel === 'string' 
    ? opportunityData.riskLevel 
    : 'Medium';
    
  const priority = opportunityData.roiScore && opportunityData.roiScore > 80 
    ? "Quick Win" 
    : opportunityData.type?.includes('Passive') 
      ? "Passive Income" 
      : opportunityData.skillGapDays && opportunityData.skillGapDays > 30 
        ? "Aspirational Path" 
        : "Growth Opportunity";
        
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ 
        opacity: 1, 
        y: 0,
        transition: { 
          duration: 0.4,
        }
      }}
      exit={{ opacity: 0, y: -20 }}
    >
      <Card 
        className="h-full cursor-pointer hover:shadow-md transition-all duration-300 border-2 hover:border-primary/40 relative"
      >
        {/* Delete button */}
        <div className="absolute top-2 right-2 z-10">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (confirm("Are you sure you want to delete this opportunity?")) {
                deleteMutation.mutate(opportunity.id);
              }
            }}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? (
              <div className="animate-spin w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </Button>
        </div>
        
        <CardHeader className="p-4 pb-0">
          <div className="flex justify-between items-start mb-2">
            <Badge
              variant="outline"
              className={`mr-2 flex items-center gap-1 ${
                opportunityData.type?.toLowerCase().includes('freelance') 
                  ? "bg-amber-100 text-amber-800 border-amber-200"
                : opportunityData.type?.toLowerCase().includes('digital') 
                  ? "bg-green-100 text-green-800 border-green-200"
                : opportunityData.type?.toLowerCase().includes('content') 
                  ? "bg-blue-100 text-blue-800 border-blue-200"
                : opportunityData.type?.toLowerCase().includes('service') 
                  ? "bg-purple-100 text-purple-800 border-purple-200"
                : opportunityData.type?.toLowerCase().includes('passive') 
                  ? "bg-teal-100 text-teal-800 border-teal-200"
                : opportunityData.type?.toLowerCase().includes('info') 
                  ? "bg-indigo-100 text-indigo-800 border-indigo-200"
                : "bg-neutral-100 text-neutral-800 border-neutral-200"
              }`}
            >
              {getIconForType(opportunityData.type)}
              <span>{opportunityData.type || "Opportunity"}</span>
            </Badge>
            
            <Badge
              variant="outline"
              className={`${
                priority === "Quick Win" 
                  ? "bg-green-100 text-green-800 border-green-200"
                : priority === "Growth Opportunity" 
                  ? "bg-blue-100 text-blue-800 border-blue-200"
                : priority === "Aspirational Path" 
                  ? "bg-purple-100 text-purple-800 border-purple-200"
                : priority === "Passive Income" 
                  ? "bg-teal-100 text-teal-800 border-teal-200"
                : "bg-neutral-100 text-neutral-800 border-neutral-200"
              }`}
            >
              {priority}
            </Badge>
          </div>
          
          <div className="text-xl font-semibold leading-tight mb-1">
            {opportunityData.title || "Untitled Opportunity"}
          </div>
          
          <div className="flex items-center mt-1 gap-2">
            <div className="flex items-center mr-2">
              <TrendingUp className="w-3.5 h-3.5 mr-1 text-primary" />
              <span className="text-xs font-medium">ROI: {opportunityData.roiScore || 75}/100</span>
            </div>
            
            <div className="flex items-center">
              <DollarSign className="w-3.5 h-3.5 mr-1 text-green-500" />
              <span className="text-xs">{opportunityData.incomePotential || "$500-1000/month"}</span>
            </div>
            
            <Badge 
              variant="outline" 
              className={`${
                normalizedRiskLevel.toLowerCase() === "low"
                  ? "bg-green-100 text-green-800 border-green-200"
                : normalizedRiskLevel.toLowerCase() === "medium"
                  ? "bg-amber-100 text-amber-800 border-amber-200"
                : normalizedRiskLevel.toLowerCase() === "high"
                  ? "bg-red-100 text-red-800 border-red-200"
                : "bg-amber-100 text-amber-800 border-amber-200"
              } text-xs`}
            >
              {normalizedRiskLevel} Risk
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="p-4 pt-2">
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-neutral-500 flex items-center">
                <Clock className="w-3.5 h-3.5 mr-1 text-amber-500" />
                Time to Revenue
              </span>
              <span className="font-medium">{opportunityData.timeToFirstRevenue || "1-4 weeks"}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-neutral-500 flex items-center">
                <Building className="w-3.5 h-3.5 mr-1 text-blue-500" />
                Startup Cost
              </span>
              <span className="font-medium">{opportunityData.startupCost || "$0-100"}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-neutral-500 flex items-center">
                <Target className="w-3.5 h-3.5 mr-1 text-purple-500" />
                Skill Gap
              </span>
              <span className="font-medium">~{opportunityData.skillGapDays || 14} days</span>
            </div>
          </div>
          
          <Link href={`/opportunity/${opportunity.id}`} passHref>
            <Button 
              className="w-full mt-4" 
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
              }}
            >
              View Details
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default OpportunityCard;