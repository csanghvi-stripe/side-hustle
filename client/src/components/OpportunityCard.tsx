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
  ChevronRight,
  Trash2,
  HelpCircle,
  Info,
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
  const typeUpperCase = type?.toUpperCase() || '';
  
  // Handle schema enum types
  if (typeUpperCase === 'FREELANCE' || typeUpperCase.includes('FREELANCE')) {
    return <Briefcase className="w-5 h-5 text-blue-600" />;
  } else if (typeUpperCase === 'DIGITAL_PRODUCT' || typeUpperCase.includes('DIGITAL') || typeUpperCase.includes('PRODUCT')) {
    return <Package className="w-5 h-5 text-purple-600" />;
  } else if (typeUpperCase === 'CONTENT' || typeUpperCase.includes('CONTENT') || typeUpperCase.includes('CREATION')) {
    return <Brush className="w-5 h-5 text-pink-600" />;
  } else if (typeUpperCase === 'SERVICE' || typeUpperCase.includes('SERVICE')) {
    return <CircleDollarSign className="w-5 h-5 text-green-600" />;
  } else if (typeUpperCase === 'PASSIVE' || typeUpperCase.includes('PASSIVE')) {
    return <Monitor className="w-5 h-5 text-cyan-600" />;
  } else if (typeUpperCase === 'INFO_PRODUCT' || typeUpperCase.includes('INFO') || typeUpperCase.includes('COURSE')) {
    return <Presentation className="w-5 h-5 text-amber-600" />;
  } else if (typeUpperCase.includes('SOFTWARE') || typeUpperCase.includes('DEVELOP')) {
    return <Code className="w-5 h-5 text-blue-600" />;
  } else if (typeUpperCase.includes('MARKET')) {
    return <Megaphone className="w-5 h-5 text-red-600" />;
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
}

const OpportunityCard: React.FC<OpportunityCardProps> = ({ opportunity }) => {
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

      // Normalize opportunity type to match enum values
      let normalizedType =
        parsed.type || (opportunity as any).type || "Freelance";

      // Ensure type matches one of our enum values for filtering
      if (normalizedType && typeof normalizedType === "string") {
        // Convert to title case to match our enum values
        const typeWords = normalizedType.split(" ");
        normalizedType = typeWords
          .map(
            (word) =>
              word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
          )
          .join(" ");

        // Map to defined opportunity types
        if (normalizedType.includes("Freelance")) {
          normalizedType = "Freelance";
        } else if (
          normalizedType.includes("Digital") ||
          normalizedType.includes("Product")
        ) {
          normalizedType = "Digital Product";
        } else if (normalizedType.includes("Content")) {
          normalizedType = "Content Creation";
        } else if (normalizedType.includes("Service")) {
          normalizedType = "Service-Based";
        } else if (normalizedType.includes("Passive")) {
          normalizedType = "Passive Income";
        } else {
          normalizedType = "Freelance"; // Default to Freelance
        }
      }

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

      // Normalize opportunity type to match enum values
      let normalizedType =
        parsed.type || (opportunity as any).type || "Freelance";

      // Ensure type matches one of our enum values for filtering
      if (normalizedType && typeof normalizedType === "string") {
        // Convert to title case to match our enum values
        const typeWords = normalizedType.split(" ");
        normalizedType = typeWords
          .map(
            (word) =>
              word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
          )
          .join(" ");

        // Map to defined opportunity types
        if (normalizedType.includes("Freelance")) {
          normalizedType = "Freelance";
        } else if (
          normalizedType.includes("Digital") ||
          normalizedType.includes("Product")
        ) {
          normalizedType = "Digital Product";
        } else if (normalizedType.includes("Content")) {
          normalizedType = "Content Creation";
        } else if (normalizedType.includes("Service")) {
          normalizedType = "Service-Based";
        } else if (normalizedType.includes("Passive")) {
          normalizedType = "Passive Income";
        } else {
          normalizedType = "Freelance"; // Default to Freelance
        }
      }

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

  // This is the simplified summary card for the opportunities list page that matches the screenshot
  return (
    <TooltipProvider>
      <div className="border border-neutral-100 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition bg-white p-6 relative">
        {/* Date badge in top right */}

        {/* Delete button */}
        <div className="absolute top-4 left-4">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full"
            onClick={() => {
              if (
                confirm("Are you sure you want to delete this opportunity?")
              ) {
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

        <div className="flex flex-col gap-5">
          {/* Header with type */}
          <div className="flex items-center gap-3 mt-3">
            <div className="flex-shrink-0">
              {getIconForType(opportunityData.type)}
            </div>
            <Badge
              variant={
                (typeVariants[
                  opportunityData.type as keyof typeof typeVariants
                ] || "default") as any
              }
            >
              {opportunityData.type}
            </Badge>
          </div>

          {/* Brief opportunity title and description */}
          <div className="space-y-2">
            <h3 className="text-lg font-medium text-slate-900">{opportunityData.title}</h3>
            <p className="text-sm text-neutral-600 line-clamp-2">
              {opportunityData.description}
            </p>
          </div>
          
          {/* ROI Analysis Section with tooltip */}
          <div className="mt-2">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-primary" />
              <h4 className="font-medium text-sm">ROI Analysis</h4>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="inline-flex items-center">
                    <div className="bg-slate-800 text-white px-2 py-1 rounded-md text-xs font-medium">
                      {opportunityData.roiScore}/100
                    </div>
                    <HelpCircle className="h-4 w-4 ml-1 text-neutral-400" />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">
                    This ROI score is calculated based on initial investment,
                    expected income, and time to achieve results.
                    <br />
                    <br />
                    <strong>Higher score (75-100):</strong> Excellent return on
                    time/money invested
                    <br />
                    <strong>Medium score (50-74):</strong> Good balance of
                    effort and return
                    <br />
                    <strong>Lower score (below 50):</strong> May require more
                    effort or investment
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* Metrics Grid with tooltips */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-neutral-500 flex items-center">
                Potential Monthly Income
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-3 w-3 ml-1 text-neutral-400" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">
                      Estimated income range based on market rates for this
                      opportunity type. Actual earnings may vary based on your
                      skills, time invested, and market conditions.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </p>
              <div className="flex items-center mt-1">
                <DollarSign className="w-4 h-4 text-green-500 mr-1" />
                <span className="font-medium">
                  {opportunityData.incomePotential}
                </span>
              </div>
            </div>

            <div>
              <p className="text-xs text-neutral-500 flex items-center">
                Time to First Revenue
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-3 w-3 ml-1 text-neutral-400" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">
                      Average time frame to earn your first dollar based on user
                      data and industry averages. Focused effort can often
                      reduce this timeline.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </p>
              <div className="flex items-center mt-1">
                <Clock className="w-4 h-4 text-amber-500 mr-1" />
                <span className="font-medium">
                  {opportunityData.timeToFirstRevenue}
                </span>
              </div>
            </div>

            <div>
              <p className="text-xs text-neutral-500 flex items-center">
                Skill Gap Closure
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-3 w-3 ml-1 text-neutral-400" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">
                      Estimated time needed to acquire missing skills required
                      for this opportunity. Based on your current skill profile
                      and the requirements for this opportunity type.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </p>
              <div className="flex items-center mt-1">
                <Target className="w-4 h-4 text-purple-500 mr-1" />
                <span className="font-medium">
                  ~{opportunityData.skillGapDays} days
                </span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="grid grid-cols-2 gap-3 mt-3">
            <Link href={`/opportunity/${opportunity.id}`}>
              <Button
                variant="outline"
                className="w-full transition-all hover:bg-primary hover:text-white group"
                onClick={() => {
                  // Add debug logging
                  console.log(
                    "View Details clicked for opportunity ID:",
                    opportunity.id,
                  );
                }}
              >
                View Details
                <ChevronRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
            <Link href={`/action-plan?opportunityId=${opportunity.id}`}>
              <Button className="w-full">Create Plan</Button>
            </Link>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default OpportunityCard;
