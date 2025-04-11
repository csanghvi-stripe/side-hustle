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
  Shapes,
  Sparkles,
  TrendingUp,
  Target,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { OpportunityType, RiskLevel } from "@/types";
import { AnimatePresence, motion } from "framer-motion";

export default function SavedOpportunitiesPage() {
  const { user } = useAuth();
  const [activeFilter, setActiveFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [, setLocation] = useLocation();

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

  // Filter opportunities based on active filter and search query
  const filteredOpportunities = savedOpportunities
    ? savedOpportunities.filter((opportunity) => {
        console.log("Filtering opportunity:", opportunity);

        let opportunityType = "";
        let opportunityPriority = "";

        // Try to extract the opportunity type from various data structures
        try {
          if (typeof opportunity.opportunityData === "string") {
            const parsed = JSON.parse(opportunity.opportunityData);
            opportunityType = parsed.type || "";
            
            // Determine priority based on data
            const roiScore = parsed.roiScore || 0;
            const riskLevel = parsed.riskLevel || "Medium";
            const skillGapDays = parsed.skillGapDays || 0;
            const timeToRevenue = parsed.timeToFirstRevenue || "";
            
            if (
              roiScore > 80 &&
              riskLevel.toLowerCase() === "low" &&
              timeToRevenue.includes("week") &&
              skillGapDays < 14
            ) {
              opportunityPriority = "quick-wins";
            } else if (opportunityType.includes("PASSIVE") || opportunityType.includes("Passive")) {
              opportunityPriority = "passive";
            } else if (skillGapDays > 30) {
              opportunityPriority = "aspirational";
            } else {
              opportunityPriority = "growth";
            }
            
          } else if (
            opportunity.opportunityData &&
            typeof opportunity.opportunityData === "object"
          ) {
            const parsed = opportunity.opportunityData as any;
            opportunityType = parsed.type || "";
            
            // Determine priority for object data
            const roiScore = parsed.roiScore || 0;
            const riskLevel = parsed.riskLevel || "Medium";
            const skillGapDays = parsed.skillGapDays || 0;
            const timeToRevenue = parsed.timeToFirstRevenue || "";
            
            if (
              roiScore > 80 &&
              riskLevel.toLowerCase() === "low" &&
              timeToRevenue.includes("week") &&
              skillGapDays < 14
            ) {
              opportunityPriority = "quick-wins";
            } else if (opportunityType.includes("PASSIVE") || opportunityType.includes("Passive")) {
              opportunityPriority = "passive";
            } else if (skillGapDays > 30) {
              opportunityPriority = "aspirational";
            } else {
              opportunityPriority = "growth";
            }
          }

          // If type is missing from opportunityData, check opportunity.type
          if (!opportunityType && (opportunity as any).type) {
            opportunityType = (opportunity as any).type;
          }

          // Normalize opportunity type for comparison
          if (opportunityType) {
            // First, handle database-style uppercase enum values
            const typeToCheck = opportunityType.toUpperCase();

            // Check for direct matches from database schema enum values
            if (
              typeToCheck === "FREELANCE" ||
              typeToCheck === "FREELANCING"
            ) {
              opportunityType = OpportunityType.FREELANCE;
            } else if (typeToCheck === "DIGITAL_PRODUCT") {
              opportunityType = OpportunityType.DIGITAL_PRODUCT;
            } else if (
              typeToCheck === "CONTENT" ||
              typeToCheck === "CONTENT_CREATION"
            ) {
              opportunityType = OpportunityType.CONTENT;
            } else if (
              typeToCheck === "SERVICE" ||
              typeToCheck === "SERVICE_BASED"
            ) {
              opportunityType = OpportunityType.SERVICE;
            } else if (
              typeToCheck === "PASSIVE" ||
              typeToCheck === "PASSIVE_INCOME"
            ) {
              opportunityType = OpportunityType.PASSIVE;
            } else if (typeToCheck === "INFO_PRODUCT") {
              opportunityType = OpportunityType.INFO_PRODUCT;
            }
          }

          console.log(
            `Opportunity ${opportunity.id} type: "${opportunityType}", activeFilter: "${activeFilter}"`,
          );

          // Filter by priority when specific filter is selected
          if (activeFilter !== "all") {
            if (activeFilter === "quick-wins" && opportunityPriority !== "quick-wins") return false;
            if (activeFilter === "growth" && opportunityPriority !== "growth") return false;
            if (activeFilter === "aspirational" && opportunityPriority !== "aspirational") return false;
            if (activeFilter === "passive" && opportunityPriority !== "passive") return false;
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
  
  // Function to navigate to the opportunity detail page
  const handleOpportunityClick = (opportunity: MonetizationOpportunity) => {
    if (!opportunity || !opportunity.id) return;
    
    // Navigate to the opportunity detail page
    setLocation(`/opportunity/${opportunity.id}`);
  };

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
            <h3 className="font-medium">Filter Results</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={activeFilter === "all" ? "default" : "outline"}
              size="sm"
              className="flex items-center"
              onClick={() => setActiveFilter("all")}
            >
              <Shapes className="w-4 h-4 mr-2" />
              All Opportunities
            </Button>
            <Button
              variant={activeFilter === "quick-wins" ? "default" : "outline"}
              size="sm"
              className="flex items-center"
              onClick={() => setActiveFilter("quick-wins")}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Quick Wins
            </Button>
            <Button
              variant={activeFilter === "growth" ? "default" : "outline"}
              size="sm"
              className="flex items-center"
              onClick={() => setActiveFilter("growth")}
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              Growth Opportunities
            </Button>
            <Button
              variant={activeFilter === "aspirational" ? "default" : "outline"}
              size="sm"
              className="flex items-center"
              onClick={() => setActiveFilter("aspirational")}
            >
              <Target className="w-4 h-4 mr-2" />
              Aspirational Paths
            </Button>
            <Button
              variant={activeFilter === "passive" ? "default" : "outline"}
              size="sm"
              className="flex items-center"
              onClick={() => setActiveFilter("passive")}
            >
              <Gift className="w-4 h-4 mr-2" />
              Passive Income
            </Button>
          </div>
        </div>

        <AnimatePresence>
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
                      // Get priority for the opportunity
                      let priority = "Growth Opportunity"; // Default
                      
                      try {
                        let data = {};
                        if (typeof opportunity.opportunityData === "string") {
                          data = JSON.parse(opportunity.opportunityData);
                        } else if (opportunity.opportunityData && typeof opportunity.opportunityData === "object") {
                          data = opportunity.opportunityData;
                        }
                        
                        const parsedData = data as any;
                        const roiScore = parsedData.roiScore || 0;
                        const riskLevel = (parsedData.riskLevel || "").toLowerCase();
                        const timeToRevenue = parsedData.timeToFirstRevenue || "";
                        const skillGapDays = parsedData.skillGapDays || 0;
                        const type = parsedData.type || "";
                        
                        if (
                          roiScore > 80 &&
                          riskLevel === "low" &&
                          timeToRevenue.includes("week") &&
                          skillGapDays < 14
                        ) {
                          priority = "Quick Win";
                        } else if (type.includes("PASSIVE") || type.includes("Passive")) {
                          priority = "Passive Income";
                        } else if (skillGapDays > 30) {
                          priority = "Aspirational Path";
                        }
                      } catch (error) {
                        console.error("Error determining priority:", error);
                      }
                      
                      return (
                        <motion.div
                          key={opportunity.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ 
                            opacity: 1, 
                            y: 0,
                            transition: { 
                              delay: 0.1,
                              duration: 0.4,
                            }
                          }}
                          exit={{ opacity: 0, y: -20 }}
                          className="relative"
                        >
                          <div className="absolute top-2 right-2 z-10">
                            <Badge className="text-xs bg-slate-700 hover:bg-slate-800">
                              {new Date(
                                opportunity.createdAt,
                              ).toLocaleDateString()}
                            </Badge>
                          </div>
                          <OpportunityCard 
                            opportunity={opportunity} 
                            source="saved"
                          />
                        </motion.div>
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
        </AnimatePresence>
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