import React, { useState } from "react";
import { MonetizationResults, OpportunityType, RiskLevel } from "@/types";
import OpportunityCard from "./OpportunityCard";
import UserMatchCard from "./UserMatchCard";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  BookmarkPlus,
  BookmarkCheck,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import { Link } from "wouter";

interface ResultsDisplayProps {
  results: MonetizationResults;
  onReset: () => void;
  saved?: boolean;
  onSave?: () => void;
}

type TabKey =
  | "all"
  | OpportunityType.FREELANCE
  | OpportunityType.DIGITAL_PRODUCT
  | OpportunityType.CONTENT
  | OpportunityType.SERVICE;

const ResultsDisplay: React.FC<ResultsDisplayProps> = ({
  results,
  onReset,
  saved = false,
  onSave,
}) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const { toast } = useToast();

  // Fix bug: showing opportunities with the correct type classification
  const filteredOpportunities =
    activeTab === "all"
      ? results.opportunities
      : results.opportunities.filter((opp) => {
          // Normalize types using our helper function
          let oppType;
          
          if (typeof opp.type === "string") {
            // Convert types from DB like "FREELANCE" to our enum values like "Freelance"
            const lowerType = opp.type.toLowerCase();
            
            if (lowerType.includes("freelance")) {
              oppType = "Freelance";
            } else if (lowerType.includes("digital") || lowerType.includes("product")) {
              oppType = "Digital Product";
            } else if (lowerType.includes("content")) {
              oppType = "Content Creation";
            } else if (lowerType.includes("service")) {
              oppType = "Service-Based";
            } else if (lowerType.includes("passive")) {
              oppType = "Passive Income";
            } else if (lowerType.includes("info")) {
              oppType = "Info Product";
            } else {
              oppType = "Freelance"; // Default
            }
          } else {
            oppType = String(opp.type);
          }
          
          console.log(`Opportunity "${opp.title}" - Original type: ${opp.type}, Normalized: ${oppType}, Tab: ${activeTab}`);
          return oppType === activeTab;
        });

  const skillsList = results.userProfile.skills.join(", ");

  // Save results mutation for authenticated users
  const saveResultsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/opportunities", {
        opportunityData: results,
        createdAt: new Date().toISOString(),
        shared: false, // Default to not sharing
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/opportunities"] });
      toast({
        title: "Saved successfully",
        description: "You can view your saved opportunities in your profile",
      });
      if (onSave) onSave();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to save",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-neutral-100">
      {/* Results Header */}
      <div className="bg-primary text-white px-6 py-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-medium">
            Your Monetization Opportunities
          </h2>
          {results.enhanced && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-200 text-blue-800">
              Enhanced Results
            </span>
          )}
        </div>
        <p className="text-primary-50">Based on your skills in {skillsList}</p>
      </div>

      {/* Results Tabs */}
      <div className="border-b border-neutral-200">
        <nav className="flex -mb-px overflow-x-auto py-2 px-6">
          <button
            className={`whitespace-nowrap py-2 px-4 border-b-2 font-medium text-sm mr-8 ${
              activeTab === "all"
                ? "text-primary border-primary"
                : "text-neutral-500 hover:text-neutral-700 border-transparent"
            }`}
            onClick={() => setActiveTab("all")}
          >
            All Opportunities
          </button>
          <button
            className={`whitespace-nowrap py-2 px-4 border-b-2 font-medium text-sm mr-8 ${
              activeTab === OpportunityType.FREELANCE
                ? "text-primary border-primary"
                : "text-neutral-500 hover:text-neutral-700 border-transparent"
            }`}
            onClick={() => setActiveTab(OpportunityType.FREELANCE)}
          >
            Freelance
          </button>
          <button
            className={`whitespace-nowrap py-2 px-4 border-b-2 font-medium text-sm mr-8 ${
              activeTab === OpportunityType.DIGITAL_PRODUCT
                ? "text-primary border-primary"
                : "text-neutral-500 hover:text-neutral-700 border-transparent"
            }`}
            onClick={() => setActiveTab(OpportunityType.DIGITAL_PRODUCT)}
          >
            Digital Products
          </button>
          <button
            className={`whitespace-nowrap py-2 px-4 border-b-2 font-medium text-sm mr-8 ${
              activeTab === OpportunityType.CONTENT
                ? "text-primary border-primary"
                : "text-neutral-500 hover:text-neutral-700 border-transparent"
            }`}
            onClick={() => setActiveTab(OpportunityType.CONTENT)}
          >
            Content Creation
          </button>
          <button
            className={`whitespace-nowrap py-2 px-4 border-b-2 font-medium text-sm ${
              activeTab === OpportunityType.SERVICE
                ? "text-primary border-primary"
                : "text-neutral-500 hover:text-neutral-700 border-transparent"
            }`}
            onClick={() => setActiveTab(OpportunityType.SERVICE)}
          >
            Services
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="p-6 space-y-6">
        {filteredOpportunities.length > 0 ? (
          filteredOpportunities.map((opportunity) => (
            <OpportunityCard
              key={opportunity.id}
              opportunity={{
                ...opportunity,
                riskLevel:
                  typeof opportunity.riskLevel === "string"
                    ? opportunity.riskLevel
                    : (opportunity.riskLevel as any)?.high
                      ? RiskLevel.HIGH
                      : (opportunity.riskLevel as any)?.medium
                        ? RiskLevel.MEDIUM
                        : RiskLevel.LOW,
              }}
              source="search"
            />
          ))
        ) : (
          <div className="p-4 text-center text-neutral-500">
            <svg
              className="mx-auto h-12 w-12 text-neutral-300"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="8" y1="12" x2="16" y2="12" />
            </svg>
            <p className="mt-2">
              No {activeTab} opportunities found matching your criteria.
            </p>
          </div>
        )}

        <div className="flex justify-center gap-4 mt-8">
          {user && (
            <Button
              onClick={() => saveResultsMutation.mutate()}
              disabled={saveResultsMutation.isPending || saved}
              variant={saved ? "outline" : "default"}
              className={
                saved ? "bg-green-50 border-green-200 text-green-700" : ""
              }
            >
              {saved ? (
                <>
                  <BookmarkCheck className="mr-2 h-4 w-4" />
                  Saved
                </>
              ) : saveResultsMutation.isPending ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <BookmarkPlus className="mr-2 h-4 w-4" />
                  Save Results
                </>
              )}
            </Button>
          )}

          {user && saved && (
            <Button variant="outline" asChild>
              <Link href="/saved-opportunities">
                View Saved
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          )}

          <Button variant="outline" onClick={onReset}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Start New Search
          </Button>
        </div>

        {/* Similar Users Section */}
        {results.similarUsers && results.similarUsers.length > 0 && (
          <div className="mt-12 border-t pt-8">
            <h3 className="text-lg font-medium text-neutral-900 mb-4">
              Connect with Similar Professionals
            </h3>
            <p className="text-neutral-600 text-sm mb-6">
              We found people with similar skills who might be on the same
              monetization journey as you. Connect with them to share
              experiences and opportunities!
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {results.similarUsers.map((match, index) => (
                <UserMatchCard key={index} match={match} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResultsDisplay;
