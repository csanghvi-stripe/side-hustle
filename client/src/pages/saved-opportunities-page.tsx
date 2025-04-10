import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { MonetizationOpportunity } from "@shared/schema";
import OpportunityCard from "@/components/OpportunityCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Loader2, 
  Filter, 
  Search, 
  Bookmark, 
  BookmarkCheck,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Link } from "wouter";
import { OpportunityType, RiskLevel } from "@/types";

export default function SavedOpportunitiesPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Pagination state
  const ITEMS_PER_PAGE = 10;
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Fetch the user's saved opportunities
  const { data: savedOpportunities, isLoading } = useQuery<MonetizationOpportunity[]>({
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
    ? savedOpportunities
        .filter((opportunity) => {
          let opportunityType = "";
          
          // Try to extract the opportunity type from various data structures
          try {
            if (typeof opportunity.opportunityData === 'string') {
              const parsed = JSON.parse(opportunity.opportunityData);
              opportunityType = parsed.type || "";
            } else if (opportunity.opportunityData && typeof opportunity.opportunityData === 'object') {
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
              if (opportunityType === 'FREELANCE' || opportunityType === 'FREELANCING') {
                opportunityType = OpportunityType.FREELANCE;
              } else if (opportunityType === 'DIGITAL_PRODUCT') {
                opportunityType = OpportunityType.DIGITAL_PRODUCT;
              } else if (opportunityType === 'CONTENT' || opportunityType === 'CONTENT_CREATION') {
                opportunityType = OpportunityType.CONTENT;
              } else if (opportunityType === 'SERVICE' || opportunityType === 'SERVICE_BASED') {
                opportunityType = OpportunityType.SERVICE;
              } else if (opportunityType === 'PASSIVE' || opportunityType === 'PASSIVE_INCOME') {
                opportunityType = OpportunityType.PASSIVE;
              } else if (opportunityType === 'INFO_PRODUCT') {
                opportunityType = OpportunityType.INFO_PRODUCT;
              } else {
                // If no direct match, try case-insensitive includes
                const typeToCheck = opportunityType.toLowerCase();
                
                if (typeToCheck.includes('freelance') || typeToCheck.includes('consulting')) {
                  opportunityType = OpportunityType.FREELANCE;
                } else if (typeToCheck.includes('digital') || typeToCheck.includes('product')) {
                  opportunityType = OpportunityType.DIGITAL_PRODUCT;
                } else if (typeToCheck.includes('content') || typeToCheck.includes('creation') || typeToCheck.includes('blog')) {
                  opportunityType = OpportunityType.CONTENT;
                } else if (typeToCheck.includes('service')) {
                  opportunityType = OpportunityType.SERVICE;
                } else if (typeToCheck.includes('passive')) {
                  opportunityType = OpportunityType.PASSIVE;
                } else if (typeToCheck.includes('info') || typeToCheck.includes('course')) {
                  opportunityType = OpportunityType.INFO_PRODUCT;
                }
              }
            }
            
            console.log(`Opportunity ${opportunity.id} type: "${opportunityType}", activeTab: "${activeTab}"`);
            
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
                titleMatch = opportunity.title.toLowerCase().includes(searchLower);
              }
              
              // Check opportunity description and type
              if (typeof opportunity.opportunityData === 'string') {
                try {
                  const parsed = JSON.parse(opportunity.opportunityData);
                  
                  if (parsed.description) {
                    descriptionMatch = parsed.description.toLowerCase().includes(searchLower);
                  }
                  
                  if (parsed.type) {
                    typeMatch = parsed.type.toLowerCase().includes(searchLower);
                  }
                } catch (e) {
                  console.error("Error parsing opportunity data for search:", e);
                }
              } else if (opportunity.opportunityData && typeof opportunity.opportunityData === 'object') {
                const parsed = opportunity.opportunityData as any;
                
                if (parsed.description) {
                  descriptionMatch = parsed.description.toLowerCase().includes(searchLower);
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
    const skills = opportunity.skills as string[] || [];
    
    if (skills.length === 0) {
      // If no skills, put in "Other" category
      const key = "Other";
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(opportunity);
    } else {
      // For each skill, add the opportunity to that skill group
      skills.forEach(skill => {
        const key = skill.trim();
        if (!groups[key]) {
          groups[key] = [];
        }
        if (!groups[key].find(opp => opp.id === opportunity.id)) {
          groups[key].push(opportunity);
        }
      });
    }
    
    return groups;
  }, {});

  // Sort skill groups alphabetically
  const sortedSkills = Object.keys(groupedBySkill).sort();
  
  // Get the total number of opportunities
  const totalOpportunities = filteredOpportunities.length;
  
  // Apply pagination to all opportunities, not just per skill group
  const paginatedOpportunities = filteredOpportunities.slice(
    (currentPage - 1) * ITEMS_PER_PAGE, 
    currentPage * ITEMS_PER_PAGE
  );
  
  // Create a new grouped structure with paginated opportunities
  const paginatedGroupedBySkill: {[skillKey: string]: MonetizationOpportunity[]} = {};
  
  // Add opportunities from the paginated list to the grouped structure
  paginatedOpportunities.forEach(opportunity => {
    const skills = opportunity.skills as string[] || [];
    
    if (skills.length === 0) {
      const key = "Other";
      if (!paginatedGroupedBySkill[key]) {
        paginatedGroupedBySkill[key] = [];
      }
      paginatedGroupedBySkill[key].push(opportunity);
    } else {
      skills.forEach(skill => {
        const key = skill.trim();
        if (!paginatedGroupedBySkill[key]) {
          paginatedGroupedBySkill[key] = [];
        }
        if (!paginatedGroupedBySkill[key].find(opp => opp.id === opportunity.id)) {
          paginatedGroupedBySkill[key].push(opportunity);
        }
      });
    }
  });
  
  // Sort skill groups alphabetically
  const paginatedSortedSkills = Object.keys(paginatedGroupedBySkill).sort();
  
  // Calculate total pages
  const totalPages = Math.ceil(totalOpportunities / ITEMS_PER_PAGE);
  
  // Reset to page 1 if current page is out of bounds after filtering
  if (currentPage > totalPages && totalPages > 0) {
    setCurrentPage(1);
  }

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
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList className="mb-8">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value={OpportunityType.FREELANCE}>{OpportunityType.FREELANCE}</TabsTrigger>
            <TabsTrigger value={OpportunityType.DIGITAL_PRODUCT}>{OpportunityType.DIGITAL_PRODUCT}</TabsTrigger>
            <TabsTrigger value={OpportunityType.CONTENT}>{OpportunityType.CONTENT}</TabsTrigger>
            <TabsTrigger value={OpportunityType.SERVICE}>{OpportunityType.SERVICE}</TabsTrigger>
          </TabsList>
          
          <TabsContent value={activeTab} className="mt-0">
            {filteredOpportunities.length > 0 ? (
              <div className="space-y-10">
                {/* Display the paginated skills and opportunities */}
                {paginatedSortedSkills.map((skill: string) => (
                  <div key={skill}>
                    <div className="flex items-center mb-4">
                      <h2 className="text-lg font-semibold">Skill: {skill}</h2>
                      <Badge variant="secondary" className="ml-3">
                        {groupedBySkill[skill].length} total opportunities
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {paginatedGroupedBySkill[skill].map((opportunity: MonetizationOpportunity) => {
                        // Render the opportunity directly
                        return (
                          <div key={opportunity.id} className="relative">
                            <div className="absolute top-2 right-2 z-10">
                              <Badge className="text-xs bg-slate-700 hover:bg-slate-800">
                                {new Date(opportunity.createdAt).toLocaleDateString()}
                              </Badge>
                            </div>
                            <OpportunityCard opportunity={opportunity} source="saved" />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
                
                {/* Pagination controls at the bottom of all opportunities */}
                {totalPages > 1 && (
                  <div className="flex justify-center items-center mt-8 space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Previous
                    </Button>
                    
                    <div className="text-sm text-neutral-500">
                      Page {currentPage} of {totalPages}
                      <span className="ml-2 text-xs text-neutral-400">
                        (Showing {Math.min(ITEMS_PER_PAGE, paginatedOpportunities.length)} of {totalOpportunities} opportunities)
                      </span>
                    </div>
                    
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <Bookmark className="h-12 w-12 text-neutral-300 mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No saved opportunities found</h3>
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
          </TabsContent>
        </Tabs>
      </main>
      
      <footer className="bg-white border-t border-neutral-200 py-6 mt-12">
        <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center">
          <div className="text-neutral-400 text-sm mb-4 md:mb-0">
            © {new Date().getFullYear()} SideHustle. All rights reserved.
          </div>
          <div className="flex space-x-6">
            <a href="#" className="text-neutral-500 hover:text-primary text-sm">Help Center</a>
            <a href="#" className="text-neutral-500 hover:text-primary text-sm">Privacy Policy</a>
            <a href="#" className="text-neutral-500 hover:text-primary text-sm">Terms of Service</a>
          </div>
        </div>
      </footer>
    </div>
  );
}