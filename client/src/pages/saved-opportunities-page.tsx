import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { MonetizationOpportunity } from "@shared/schema";
import OpportunityCard from "@/components/OpportunityCard";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Loader2, 
  Filter, 
  Search, 
  Bookmark, 
  BookmarkCheck,
  PenTool,
  Laptop,
  ScrollText,
  Users,
  Gift,
  Shapes
} from "lucide-react";
import { Link } from "wouter";
import { OpportunityType, RiskLevel } from "@/types";

export default function SavedOpportunitiesPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch the user's saved opportunities
  const { data: savedOpportunities, isLoading } = useQuery<
    MonetizationOpportunity[]
  >({
    queryKey: ["/api/opportunities"],
    enabled: !!user,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-50">
        <div className="max-w-6xl mx-auto px-4 py-12 flex justify-center items-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="ml-2">Loading your saved opportunities...</span>
        </div>
      </div>
    );
  }

  // Filter opportunities based on active tab and search query
  const filteredOpportunities = savedOpportunities
    ? savedOpportunities.filter((opportunity) => {
        console.log("Filtering opportunity:", opportunity);

        let opportunityType = "";

        // Try to extract the opportunity type from various data structures
        try {
          if (typeof opportunity.opportunityData === "string") {
            const parsed = JSON.parse(opportunity.opportunityData);
            opportunityType = parsed.type || "";
          } else if (
            opportunity.opportunityData &&
            typeof opportunity.opportunityData === "object"
          ) {
            const parsed = opportunity.opportunityData as any;
            opportunityType = parsed.type || "";
          }

          // If type is missing from opportunityData, check opportunity.type
          if (!opportunityType && (opportunity as any).type) {
            opportunityType = (opportunity as any).type;
          }

          // Normalize opportunity type for comparison
          if (opportunityType) {
            // First, handle database-style uppercase enum values
            opportunityType = opportunityType.toUpperCase();

            // Check for direct matches from database schema enum values
            if (
              opportunityType === "FREELANCE" ||
              opportunityType === "FREELANCING"
            ) {
              opportunityType = OpportunityType.FREELANCE;
            } else if (opportunityType === "DIGITAL_PRODUCT") {
              opportunityType = OpportunityType.DIGITAL_PRODUCT;
            } else if (
              opportunityType === "CONTENT" ||
              opportunityType === "CONTENT_CREATION"
            ) {
              opportunityType = OpportunityType.CONTENT;
            } else if (
              opportunityType === "SERVICE" ||
              opportunityType === "SERVICE_BASED"
            ) {
              opportunityType = OpportunityType.SERVICE;
            } else if (
              opportunityType === "PASSIVE" ||
              opportunityType === "PASSIVE_INCOME"
            ) {
              opportunityType = OpportunityType.PASSIVE;
            } else if (opportunityType === "INFO_PRODUCT") {
              opportunityType = OpportunityType.INFO_PRODUCT;
            } else {
              // If no direct match, try case-insensitive includes
              const typeToCheck = opportunityType.toLowerCase();

              if (
                typeToCheck.includes("freelance") ||
                typeToCheck.includes("consulting")
              ) {
                opportunityType = OpportunityType.FREELANCE;
              } else if (
                typeToCheck.includes("digital") ||
                typeToCheck.includes("product")
              ) {
                opportunityType = OpportunityType.DIGITAL_PRODUCT;
              } else if (
                typeToCheck.includes("content") ||
                typeToCheck.includes("creation") ||
                typeToCheck.includes("blog")
              ) {
                opportunityType = OpportunityType.CONTENT;
              } else if (typeToCheck.includes("service")) {
                opportunityType = OpportunityType.SERVICE;
              } else if (typeToCheck.includes("passive")) {
                opportunityType = OpportunityType.PASSIVE;
              } else if (
                typeToCheck.includes("info") ||
                typeToCheck.includes("course")
              ) {
                opportunityType = OpportunityType.INFO_PRODUCT;
              }
            }
          }

          console.log(
            `Opportunity ${opportunity.id} type: "${opportunityType}", activeTab: "${activeTab}"`,
          );

          // Filter by type if not on "all" tab
          if (activeTab !== "all" && activeTab !== opportunityType) {
            return false;
          }

          // Filter by search query if present
          if (searchQuery) {
            const searchLower = searchQuery.toLowerCase();
            let titleMatch = false;
            let descriptionMatch = false;
            let typeMatch = false;

            // Check opportunity title
            if (opportunity.title) {
              titleMatch = opportunity.title
                .toLowerCase()
                .includes(searchLower);
            }

            // Check opportunity description and type
            if (typeof opportunity.opportunityData === "string") {
              try {
                const parsed = JSON.parse(opportunity.opportunityData);

                if (parsed.description) {
                  descriptionMatch = parsed.description
                    .toLowerCase()
                    .includes(searchLower);
                }

                if (parsed.type) {
                  typeMatch = parsed.type.toLowerCase().includes(searchLower);
                }
              } catch (e) {
                console.error("Error parsing opportunity data for search:", e);
              }
            } else if (
              opportunity.opportunityData &&
              typeof opportunity.opportunityData === "object"
            ) {
              const parsed = opportunity.opportunityData as any;

              if (parsed.description) {
                descriptionMatch = parsed.description
                  .toLowerCase()
                  .includes(searchLower);
              }

              if (parsed.type) {
                typeMatch = parsed.type.toLowerCase().includes(searchLower);
              }
            }

            return titleMatch || descriptionMatch || typeMatch;
          }

          return true;
        } catch (error) {
          console.error("Error processing opportunity for filtering:", error);
          return false;
        }
      })
    : [];

  // Group saved opportunities by skill
  const groupedBySkill = filteredOpportunities.reduce<{
    [skillKey: string]: MonetizationOpportunity[];
  }>((groups, opportunity) => {
    // Get skills from the opportunity
    const skills = (opportunity.skills as string[]) || [];

    if (skills.length === 0) {
      // If no skills, put in "Other" category
      const key = "Other";
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(opportunity);
    } else {
      // For each skill, add the opportunity to that skill group
      skills.forEach((skill) => {
        const key = skill.trim();
        if (!groups[key]) {
          groups[key] = [];
        }
        if (!groups[key].find((opp) => opp.id === opportunity.id)) {
          groups[key].push(opportunity);
        }
      });
    }

    return groups;
  }, {});

  // Sort skill groups alphabetically
  const sortedSkills = Object.keys(groupedBySkill).sort();

  return (
    <div className="min-h-screen bg-neutral-50">
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">My Saved Opportunities</h1>
            <p className="text-neutral-500 mt-2">
              View and manage your saved monetization opportunities
            </p>
          </div>

          <Button asChild className="mt-4 md:mt-0">
            <Link href="/">Discover New Opportunities</Link>
          </Button>
        </div>

        <div className="mb-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-400" />
            <input
              type="text"
              placeholder="Search your saved opportunities..."
              className="w-full pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="mb-6">
          <div className="flex items-center mb-2">
            <Filter className="w-4 h-4 mr-2 text-neutral-500" />
            <h3 className="font-medium">Filter Opportunities</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={activeTab === "all" ? "default" : "outline"}
              size="sm"
              className="flex items-center"
              onClick={() => setActiveTab("all")}
            >
              <Shapes className="w-4 h-4 mr-2" />
              All Opportunities
            </Button>
            <Button
              variant={activeTab === OpportunityType.FREELANCE ? "default" : "outline"}
              size="sm"
              className="flex items-center"
              onClick={() => setActiveTab(OpportunityType.FREELANCE)}
            >
              <PenTool className="w-4 h-4 mr-2" />
              Freelance
            </Button>
            <Button
              variant={activeTab === OpportunityType.DIGITAL_PRODUCT ? "default" : "outline"}
              size="sm"
              className="flex items-center"
              onClick={() => setActiveTab(OpportunityType.DIGITAL_PRODUCT)}
            >
              <Laptop className="w-4 h-4 mr-2" />
              Digital Product
            </Button>
            <Button
              variant={activeTab === OpportunityType.CONTENT ? "default" : "outline"}
              size="sm"
              className="flex items-center"
              onClick={() => setActiveTab(OpportunityType.CONTENT)}
            >
              <ScrollText className="w-4 h-4 mr-2" />
              Content Creation
            </Button>
            <Button
              variant={activeTab === OpportunityType.SERVICE ? "default" : "outline"}
              size="sm"
              className="flex items-center"
              onClick={() => setActiveTab(OpportunityType.SERVICE)}
            >
              <Users className="w-4 h-4 mr-2" />
              Service-Based
            </Button>
            <Button
              variant={activeTab === OpportunityType.PASSIVE ? "default" : "outline"}
              size="sm"
              className="flex items-center"
              onClick={() => setActiveTab(OpportunityType.PASSIVE)}
            >
              <Gift className="w-4 h-4 mr-2" />
              Passive Income
            </Button>
          </div>
        </div>

{sortedSkills && sortedSkills.length > 0 ? (
  <div className="space-y-10">
    {sortedSkills.map((skill: string) => (
      <div key={skill}>
        <div className="flex items-center mb-4">
          <h2 className="text-lg font-semibold">Skill: {skill}</h2>
          <Badge variant="secondary" className="ml-3">
            {groupedBySkill[skill].length} opportunities
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {groupedBySkill[skill].map((opportunity) => {
            // Render the opportunity directly
            return (
              <div key={opportunity.id} className="relative">
                <div className="absolute top-2 right-2 z-10">
                  <Badge className="text-xs bg-slate-700 hover:bg-slate-800">
                    {new Date(
                      opportunity.createdAt,
                    ).toLocaleDateString()}
                  </Badge>
                </div>
                <OpportunityCard opportunity={opportunity} />
              </div>
            );
          })}
        </div>
      </div>
    ))}
  </div>
) : (
  <Card>
    <CardContent className="flex flex-col items-center justify-center py-16">
      <Bookmark className="h-12 w-12 text-neutral-300 mb-4" />
      <h3 className="text-xl font-semibold mb-2">
        No saved opportunities found
      </h3>
      <p className="text-neutral-500 text-center mb-6">
        {searchQuery
          ? "No results match your search criteria. Try adjusting your search terms."
          : "You haven't saved any monetization opportunities yet."}
      </p>
      <Button asChild>
        <Link href="/">Discover Opportunities</Link>
      </Button>
    </CardContent>
  </Card>
)}
      </main>

      <footer className="bg-white border-t border-neutral-200 py-6 mt-12">
        <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center">
          <div className="text-neutral-400 text-sm mb-4 md:mb-0">
            © {new Date().getFullYear()} SideHustle. All rights reserved.
          </div>
          <div className="flex space-x-6">
            <a href="#" className="text-neutral-500 hover:text-primary text-sm">
              Help Center
            </a>
            <a href="#" className="text-neutral-500 hover:text-primary text-sm">
              Privacy Policy
            </a>
            <a href="#" className="text-neutral-500 hover:text-primary text-sm">
              Terms of Service
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
