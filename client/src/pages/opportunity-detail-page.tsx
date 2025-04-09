import React, { useState } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { MonetizationOpportunity } from "@shared/schema";
import {
  ArrowLeft,
  Briefcase,
  Building,
  Calendar,
  ChevronRight,
  CircleDollarSign,
  Clock,
  Code,
  DollarSign,
  ExternalLink,
  FileCheck,
  GraduationCap,
  Layers,
  LayoutList,
  MessageSquare,
  Monitor,
  Presentation,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import SkillGapAnalyzer from "@/components/analytics/SkillGapAnalyzer";

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

const OpportunityDetailPage = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const params = useParams();
  const [, setLocation] = useLocation();
  const opportunityId = params.id;

  // Fetch opportunity details
  const { data: opportunity, isLoading, error } = useQuery<MonetizationOpportunity>({
    queryKey: ["/api/opportunities", opportunityId],
    enabled: !!opportunityId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
          <p className="mt-4 text-neutral-600">Loading opportunity details...</p>
        </div>
      </div>
    );
  }

  if (error || !opportunity) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Error</CardTitle>
            <CardDescription>
              We couldn't load the opportunity details. Please try again.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setLocation("/saved-opportunities")}>
              Back to Opportunities
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Parse opportunity data
  let opportunityData: OpportunityDataType | null = null;
  try {
    if (typeof opportunity.opportunityData === 'string') {
      const parsed = JSON.parse(opportunity.opportunityData);
      
      // Generate a random ROI score if not provided
      const roiScore = parsed.roiScore || Math.floor(Math.random() * 50) + 50;
      
      // Set time to first revenue
      const timeToFirstRevenue = parsed.timeToFirstRevenue || "~30 days";
      
      // Set skill gap days
      const skillGapDays = parsed.skillGapDays || 0;
      
      opportunityData = {
        title: parsed.title || opportunity.title || "",
        type: parsed.type || "Freelance",
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
      const parsed = opportunity.opportunityData as any;
      
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
      
      // Generate a random ROI score if not provided
      const roiScore = parsed.roiScore || Math.floor(Math.random() * 50) + 50;
      
      // Set time to first revenue
      const timeToFirstRevenue = parsed.timeToFirstRevenue || "~30 days";
      
      // Set skill gap days
      const skillGapDays = parsed.skillGapDays || 0;
      
      opportunityData = {
        title: parsed.title || opportunity.title || "",
        type: parsed.type || "Freelance",
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

  // Get appropriate icon for type
  const getIconForType = (type: string) => {
    switch (type) {
      case "Freelance":
        return <Briefcase className="w-6 h-6 text-blue-600" />;
      case "Digital Product":
        return <Monitor className="w-6 h-6 text-purple-600" />;
      case "Content Creation":
        return <Presentation className="w-6 h-6 text-pink-600" />;
      case "Service-Based":
        return <CircleDollarSign className="w-6 h-6 text-green-600" />;
      case "Info Product":
        return <Layers className="w-6 h-6 text-amber-600" />;
      case "Software Development":
        return <Code className="w-6 h-6 text-blue-600" />;
      default:
        return <Briefcase className="w-6 h-6 text-neutral-600" />;
    }
  };

  // Get a variant of a badge based on risk level
  const getRiskLevelVariant = (riskLevel: string) => {
    switch (riskLevel.toLowerCase()) {
      case "low":
        return "outline";
      case "medium":
        return "secondary";
      case "high":
        return "destructive";
      default:
        return "outline";
    }
  };

  // Mock progress data - in a real app, this would come from your backend
  const progressData = {
    overallProgress: 35, // Percentage completion
    completedSteps: 2,   // Number of steps completed
    totalSteps: 7,       // Total number of steps
    nextMilestone: "Set up your portfolio website",
    targetDate: "April 30, 2025"
  };

  // Mock similar users - in a real app, this would come from your backend
  const similarUsers = [
    {
      id: 1,
      name: "Jane Wilson",
      role: "Frontend Developer",
      matchScore: 92,
      avatarUrl: null
    },
    {
      id: 2,
      name: "Michael Chen",
      role: "UX Designer",
      matchScore: 85,
      avatarUrl: null
    },
    {
      id: 3,
      name: "Sarah Roberts",
      role: "Content Creator",
      matchScore: 78,
      avatarUrl: null
    }
  ];

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header with navigation */}
      <div className="bg-white border-b border-neutral-200">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <Button
              variant="ghost"
              onClick={() => setLocation("/saved-opportunities")}
              className="flex items-center text-neutral-600 hover:text-primary"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Opportunities
            </Button>
            <div className="flex items-center gap-2">
              <Link href={`/action-plan?opportunityId=${opportunity.id}`}>
                <Button variant="outline" className="flex items-center gap-1">
                  <FileCheck className="w-4 h-4" />
                  View Action Plan
                </Button>
              </Link>
              <Link href={`/coach-page?topic=${encodeURIComponent(opportunityData.title)}`}>
                <Button className="flex items-center gap-1">
                  <MessageSquare className="w-4 h-4" />
                  Talk to Coach
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Opportunity Overview Card */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  {getIconForType(opportunityData.type)}
                  <div>
                    <CardTitle>{opportunityData.title}</CardTitle>
                    <Badge className="mt-1" variant="secondary">
                      {opportunityData.type}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-neutral-600">
                  {opportunityData.description}
                </p>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-neutral-500">Income Potential</p>
                    <p className="font-medium flex items-center mt-1">
                      <DollarSign className="w-4 h-4 text-green-500 mr-1" />
                      {opportunityData.incomePotential}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-neutral-500">Initial Investment</p>
                    <p className="font-medium flex items-center mt-1">
                      <Building className="w-4 h-4 text-blue-500 mr-1" />
                      {opportunityData.startupCost}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-neutral-500">Time to Revenue</p>
                    <p className="font-medium flex items-center mt-1">
                      <Clock className="w-4 h-4 text-amber-500 mr-1" />
                      {opportunityData.timeToFirstRevenue}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-neutral-500">Risk Level</p>
                    <Badge
                      variant={getRiskLevelVariant(opportunityData.riskLevel)}
                      className="mt-1"
                    >
                      {opportunityData.riskLevel}
                    </Badge>
                  </div>
                </div>

                <Separator />

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-sm">Steps Completed</h4>
                    <span className="text-sm text-neutral-500">
                      {progressData.completedSteps}/{progressData.totalSteps}
                    </span>
                  </div>
                  <Progress value={progressData.overallProgress} className="h-2" />
                  <div className="mt-3 text-sm text-neutral-600 flex items-center">
                    <Calendar className="w-4 h-4 mr-1 text-primary" />
                    Next milestone by {progressData.targetDate}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Skills Required Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center">
                  <GraduationCap className="w-5 h-5 mr-2 text-primary" />
                  Skills Required
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {opportunityData.requiredSkills && opportunityData.requiredSkills.length > 0 ? (
                      opportunityData.requiredSkills.map((skill, index) => (
                        <Badge key={index} variant="outline" className="px-3 py-1">
                          {skill}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-sm text-neutral-500">No specific skills required.</p>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-sm">Skill Gap</h4>
                      <span className="text-sm font-medium">
                        ~{opportunityData.skillGapDays} days to close
                      </span>
                    </div>
                    <Progress 
                      value={100 - Math.min(opportunityData.skillGapDays || 0, 100)} 
                      className="h-2" 
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Similar Users Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center">
                  <Users className="w-5 h-5 mr-2 text-primary" />
                  People with Similar Skills
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {similarUsers.map((user) => (
                    <div key={user.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                          {user.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{user.name}</p>
                          <p className="text-xs text-neutral-500">{user.role}</p>
                        </div>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {user.matchScore}% match
                      </Badge>
                    </div>
                  ))}

                  <Button variant="outline" className="w-full text-sm" size="sm">
                    Connect with More People
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right main content */}
          <div className="lg:col-span-2">
            <Tabs 
              defaultValue="overview"
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full"
            >
              <TabsList className="grid grid-cols-5 mb-6">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="roi">ROI Analysis</TabsTrigger>
                <TabsTrigger value="skills">Skill Development</TabsTrigger>
                <TabsTrigger value="steps">Success Path</TabsTrigger>
                <TabsTrigger value="resources">Resources</TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <LayoutList className="w-5 h-5 mr-2 text-primary" />
                      How It Works
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-neutral-600">
                      {opportunityData.description}
                    </p>
                    
                    <div className="mt-6">
                      <h3 className="font-medium text-base mb-3">Steps to Start</h3>
                      <ol className="space-y-3">
                        {opportunityData.stepsToStart.map((step, index) => (
                          <li key={index} className="flex">
                            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center mr-3 mt-0.5">
                              {index + 1}
                            </div>
                            <div>
                              <p className="text-neutral-700">{step}</p>
                            </div>
                          </li>
                        ))}
                      </ol>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <TrendingUp className="w-5 h-5 mr-2 text-primary" />
                      ROI Breakdown
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center mb-4">
                      <div className="bg-slate-800 text-white px-3 py-1 rounded-md text-sm font-medium mr-3">
                        {opportunityData.roiScore}/100
                      </div>
                      <p className="text-neutral-600">
                        Bang for buck assessment for this opportunity
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <p className="text-sm text-neutral-500">Potential Monthly Income</p>
                        <div className="flex items-center">
                          <DollarSign className="w-5 h-5 text-green-500 mr-1" />
                          <span className="font-medium">{opportunityData.incomePotential}</span>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <p className="text-sm text-neutral-500">Initial Investment</p>
                        <div className="flex items-center">
                          <Building className="w-5 h-5 text-blue-500 mr-1" />
                          <span className="font-medium">{opportunityData.startupCost}</span>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <p className="text-sm text-neutral-500">Time to First Revenue</p>
                        <div className="flex items-center">
                          <Clock className="w-5 h-5 text-amber-500 mr-1" />
                          <span className="font-medium">{opportunityData.timeToFirstRevenue}</span>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <p className="text-sm text-neutral-500">Skill Gap Closure</p>
                        <div className="flex items-center">
                          <Target className="w-5 h-5 text-purple-500 mr-1" />
                          <span className="font-medium">~{opportunityData.skillGapDays} days</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-6">
                      <Button className="w-full">
                        Get Detailed Financial Analysis
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {opportunityData.successStories && opportunityData.successStories.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Users className="w-5 h-5 mr-2 text-primary" />
                        Success Stories
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {opportunityData.successStories.map((story, index) => (
                        <div key={index} className="p-4 border border-primary/10 bg-gradient-to-br from-white to-primary/5 rounded-lg mb-4 last:mb-0">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white text-lg flex-shrink-0 font-semibold">
                              {story?.name ? story.name.charAt(0) : ''}
                            </div>
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <h5 className="font-semibold">{story?.name || 'Anonymous User'}</h5>
                                {story?.profileUrl && (
                                  <a 
                                    href={story.profileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs bg-primary/10 text-primary px-2 py-1 rounded hover:bg-primary/20 transition"
                                  >
                                    View Profile
                                  </a>
                                )}
                              </div>
                              <p className="text-sm text-neutral-600 mt-1">{story?.background || 'Professional with experience in this field'}</p>
                              
                              <div className="mt-3 relative pl-5 border-l-2 border-primary/30">
                                <h6 className="text-sm font-medium mb-1">The Journey:</h6>
                                <p className="text-sm text-neutral-700">{story?.journey || 'Started with small projects and gradually built up their portfolio and client base.'}</p>
                              </div>
                              
                              <div className="mt-3 bg-primary/10 p-3 rounded-md">
                                <h6 className="text-sm font-medium mb-1 flex items-center">
                                  <svg className="w-4 h-4 mr-1 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="20 6 9 17 4 12"></polyline>
                                  </svg>
                                  Current Status:
                                </h6>
                                <p className="text-sm font-medium text-primary">{story?.outcome || 'Successfully monetized their skills through this approach.'}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* ROI Analysis Tab */}
              <TabsContent value="roi" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>ROI Analysis</CardTitle>
                    <CardDescription>
                      Complete financial breakdown of this opportunity
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center mb-6">
                      <div className="bg-slate-800 text-white px-4 py-2 rounded-md text-lg font-medium mr-4">
                        {opportunityData.roiScore}/100
                      </div>
                      <div>
                        <h3 className="font-medium">Bang for buck assessment</h3>
                        <p className="text-sm text-neutral-500">
                          Based on income potential, time to revenue, and skill compatibility
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-8 mb-8">
                      <div className="space-y-4">
                        <h3 className="font-medium border-b pb-2">Income Projection</h3>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-neutral-600">Monthly Income (Optimistic)</span>
                            <span className="font-medium">${parseInt(opportunityData.incomePotential.replace(/[^0-9]/g, '') || "0") * 1.2}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-neutral-600">Monthly Income (Expected)</span>
                            <span className="font-medium">{opportunityData.incomePotential}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-neutral-600">Monthly Income (Conservative)</span>
                            <span className="font-medium">${parseInt(opportunityData.incomePotential.replace(/[^0-9]/g, '') || "0") * 0.7}</span>
                          </div>
                          <div className="flex justify-between font-medium text-primary pt-2 border-t">
                            <span>Annual Income Potential</span>
                            <span>${parseInt(opportunityData.incomePotential.replace(/[^0-9]/g, '') || "0") * 12}</span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h3 className="font-medium border-b pb-2">Investment Analysis</h3>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-neutral-600">Initial Startup Cost</span>
                            <span className="font-medium">{opportunityData.startupCost}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-neutral-600">Monthly Operating Cost</span>
                            <span className="font-medium">${parseInt(opportunityData.startupCost.replace(/[^0-9]/g, '') || "0") * 0.15}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-neutral-600">Break-even Timeline</span>
                            <span className="font-medium">
                              {parseInt(opportunityData.incomePotential.replace(/[^0-9]/g, '') || "1") === 0 
                                ? "N/A" 
                                : `${Math.ceil(parseInt(opportunityData.startupCost.replace(/[^0-9]/g, '') || "0") / parseInt(opportunityData.incomePotential.replace(/[^0-9]/g, '') || "1"))} months`}
                            </span>
                          </div>
                          <div className="flex justify-between font-medium pt-2 border-t">
                            <span>First Year Profit (Est.)</span>
                            <span className="text-green-600">
                              ${parseInt(opportunityData.incomePotential.replace(/[^0-9]/g, '') || "0") * 12 - parseInt(opportunityData.startupCost.replace(/[^0-9]/g, '') || "0") - (parseInt(opportunityData.startupCost.replace(/[^0-9]/g, '') || "0") * 0.15 * 12)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <Separator className="my-6" />

                    <div className="space-y-4">
                      <h3 className="font-medium">Time Investment Analysis</h3>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="p-4 bg-neutral-50 rounded-lg">
                          <h4 className="text-sm text-neutral-500 mb-1">Time to First Revenue</h4>
                          <p className="font-medium text-lg">{opportunityData.timeToFirstRevenue}</p>
                        </div>
                        <div className="p-4 bg-neutral-50 rounded-lg">
                          <h4 className="text-sm text-neutral-500 mb-1">Weekly Hours Required</h4>
                          <p className="font-medium text-lg">10-15 hours</p>
                        </div>
                        <div className="p-4 bg-neutral-50 rounded-lg">
                          <h4 className="text-sm text-neutral-500 mb-1">Hourly Rate Potential</h4>
                          <p className="font-medium text-lg">
                            ${Math.round(parseInt(opportunityData.incomePotential.replace(/[^0-9]/g, '') || "0") / 50)}/hr
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-8">
                      <Button className="w-full">
                        Create Financial Plan
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Skill Development Tab */}
              <TabsContent value="skills" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Skill Gap Analysis</CardTitle>
                    <CardDescription>
                      Identify skills you need to develop for this opportunity
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-6">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium">Skill Readiness</h3>
                        <span className="text-sm font-medium">
                          ~{opportunityData.skillGapDays} days to be fully equipped
                        </span>
                      </div>
                      <Progress 
                        value={100 - Math.min(opportunityData.skillGapDays || 0, 100)} 
                        className="h-2" 
                      />
                    </div>

                    <div className="space-y-4">
                      <h3 className="font-medium border-b pb-2">Required Skills</h3>
                      <div className="flex flex-wrap gap-2">
                        {opportunityData.requiredSkills && opportunityData.requiredSkills.length > 0 ? (
                          opportunityData.requiredSkills.map((skill, index) => (
                            <Badge key={index} variant="outline" className="px-3 py-1">
                              {skill}
                            </Badge>
                          ))
                        ) : (
                          <p className="text-sm text-neutral-500">No specific skills required.</p>
                        )}
                      </div>
                    </div>

                    <Separator className="my-6" />

                    <div className="mb-6">
                      <h3 className="font-medium mb-4">Detailed Skill Gap Analysis</h3>
                      {opportunity.id && <SkillGapAnalyzer opportunity={opportunity} />}
                    </div>

                    <div className="mt-8 flex gap-3">
                      <Button className="flex-1">
                        Create Learning Plan
                      </Button>
                      <Button variant="outline" className="flex-1">
                        Find Learning Resources
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Success Path Tab */}
              <TabsContent value="steps" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Success Path</CardTitle>
                    <CardDescription>
                      Step-by-step guide to launch and succeed in this opportunity
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {opportunityData.stepsToStart.map((step, index) => (
                        <div key={index} className="flex">
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center mr-4 mt-0.5">
                            {index + 1}
                          </div>
                          <div className="bg-white border border-neutral-200 rounded-lg p-4 flex-grow">
                            <h3 className="font-medium mb-2">{step}</h3>
                            <p className="text-sm text-neutral-600 mb-3">
                              {/* Generate a description based on the step */}
                              {step.toLowerCase().includes("profile") ? 
                                "Create a compelling profile that highlights your skills, experience, and unique value proposition. Include clear examples of your work and testimonials if available." :
                              step.toLowerCase().includes("client") || step.toLowerCase().includes("audience") ?
                                "Research and identify your ideal clients or audience. Understand their pain points, needs, and where they typically look for solutions like yours." :
                              step.toLowerCase().includes("tools") || step.toLowerCase().includes("accounts") ?
                                "Set up the necessary tools, software, and accounts you'll need to deliver your services or products efficiently. Ensure all systems are properly integrated." :
                              step.toLowerCase().includes("market") ?
                                "Create a marketing strategy to reach your target audience. Focus on platforms where your ideal clients spend their time and tailor your messaging to address their specific needs." :
                                "Complete this step according to your specific circumstance and skill level. Break it down into smaller sub-tasks if needed."}
                            </p>
                            <div className="flex items-center space-x-2">
                              <Button size="sm" variant="outline">
                                Mark Complete
                              </Button>
                              <Button size="sm" variant="ghost">
                                View Resources
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-8">
                      <Button className="w-full">
                        Create Detailed Action Plan
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Resources Tab */}
              <TabsContent value="resources" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Learning Resources</CardTitle>
                    <CardDescription>
                      Curated resources to help you succeed in this opportunity
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      {opportunityData.resources && opportunityData.resources.length > 0 ? (
                        opportunityData.resources.map((resource, index) => (
                          <a 
                            key={index}
                            href={resource?.url || '#'} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center p-4 rounded-lg border border-neutral-200 hover:border-primary/50 hover:bg-primary/5 transition"
                          >
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary mr-3">
                              <ExternalLink className="w-5 h-5" />
                            </div>
                            <div>
                              <h4 className="font-medium">{resource?.title || 'Resource'}</h4>
                              <p className="text-sm text-neutral-500">{resource?.source || 'Web'}</p>
                            </div>
                          </a>
                        ))
                      ) : (
                        <div className="col-span-2 text-center py-10">
                          <p className="text-neutral-500">No resources available yet.</p>
                        </div>
                      )}
                    </div>

                    <Separator className="my-6" />

                    <div className="space-y-4">
                      <h3 className="font-medium">Recommended Courses</h3>
                      <div className="space-y-3">
                        <div className="p-4 border border-neutral-200 rounded-lg flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mr-3">
                              <GraduationCap className="w-5 h-5" />
                            </div>
                            <div>
                              <h4 className="font-medium">Getting Started with {opportunityData.type}</h4>
                              <p className="text-sm text-neutral-500">Free • 2 hours</p>
                            </div>
                          </div>
                          <Button size="sm">Enroll</Button>
                        </div>
                        <div className="p-4 border border-neutral-200 rounded-lg flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600 mr-3">
                              <DollarSign className="w-5 h-5" />
                            </div>
                            <div>
                              <h4 className="font-medium">Pricing Strategies for {opportunityData.type}</h4>
                              <p className="text-sm text-neutral-500">Premium • 4 hours</p>
                            </div>
                          </div>
                          <Button size="sm">Enroll</Button>
                        </div>
                      </div>
                    </div>

                    <div className="mt-8">
                      <Button className="w-full flex items-center justify-center">
                        Get More Learning Resources
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OpportunityDetailPage;