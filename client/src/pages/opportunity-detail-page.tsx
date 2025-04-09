import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { MonetizationOpportunity } from "@shared/schema";
import { 
  ArrowRight,
  ArrowUpRight,
  Award,
  BarChart4,
  BookOpen,
  Briefcase,
  Building,
  ChevronsUp,
  ChevronRight,
  Clipboard,
  Clock,
  Code,
  DollarSign,
  Download,
  ExternalLink,
  FileText,
  Gem,
  GraduationCap,
  HelpCircle,
  Home,
  Laptop,
  LayoutDashboard,
  LayoutList,
  Lightbulb,
  Link as LinkIcon,
  ListChecks,
  Megaphone,
  MessageSquare,
  Monitor,
  Palette,
  Pencil,
  PencilLine,
  PenLine,
  PieChart,
  Search,
  ShoppingCart,
  Target,
  Truck,
  TrendingUp,
  Users,
  UserPlus,
  Video,
  VideoIcon,
} from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

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

// Function to get icon for opportunity type
const getIconForType = (type: string) => {
  const iconClasses = "w-6 h-6";
  
  switch (type?.toLowerCase()) {
    case 'freelancing':
      return <Briefcase className={iconClasses} />;
    case 'consulting':
      return <PieChart className={iconClasses} />;
    case 'e-commerce':
      return <ShoppingCart className={iconClasses} />;
    case 'content creation':
      return <PencilLine className={iconClasses} />;
    case 'digital products':
      return <Laptop className={iconClasses} />;
    case 'online courses':
      return <GraduationCap className={iconClasses} />;
    case 'app development':
      return <Code className={iconClasses} />;
    case 'coaching':
      return <MessageSquare className={iconClasses} />;
    case 'design services':
      return <Palette className={iconClasses} />;
    case 'marketing services':
      return <Megaphone className={iconClasses} />;
    case 'drop shipping':
      return <Truck className={iconClasses} />;
    default:
      return <Lightbulb className={iconClasses} />;
  }
};

// Define risk level styles
const riskLevelStyles = {
  'low': {
    bg: 'bg-green-100',
    text: 'text-green-700',
    icon: <ChevronsUp className="w-4 h-4" />,
  },
  'medium': {
    bg: 'bg-amber-100',
    text: 'text-amber-700',
    icon: <Target className="w-4 h-4" />,
  },
  'high': {
    bg: 'bg-red-100',
    text: 'text-red-700',
    icon: <TrendingUp className="w-4 h-4" />,
  },
};

// Helper functions
function getStepDescription(index: number): string {
  const descriptions = [
    "Understand your marketable skills and identify where they're most valuable. Research successful individuals in this space.",
    "Create a professional online presence that highlights your expertise and showcases examples of your work.",
    "Choose the right platforms to find clients or customers. Set up profiles and optimize them for maximum visibility.",
    "Develop clear service offerings with tiered pricing models. Research market rates for similar services.",
    "Create templates and scripts for outreach. Identify potential clients and start making connections.",
    "Start with smaller projects to build your portfolio and reputation. Deliver exceptional work to get positive reviews."
  ];
  
  return descriptions[index] || "Complete this step to progress on your journey.";
}

function getStepTimeEstimate(index: number): string {
  const estimates = ["1-2 days", "2-3 days", "1 day", "1-2 days", "1 day", "Ongoing"];
  return estimates[index] || "1-2 days";
}

function getStepDifficulty(index: number): string {
  const difficulties = ["Easy", "Medium", "Easy", "Medium", "Medium", "Hard"];
  return difficulties[index] || "Medium";
}

function getResourceIcon(resource: ResourceType) {
  const title = resource.title?.toLowerCase() || '';
  let icon = <FileText className="w-5 h-5 mr-3 text-primary" />;
  
  if (title.includes('guide') || title.includes('how to')) {
    icon = <FileText className="w-5 h-5 mr-3 text-blue-500" />;
  } else if (title.includes('video') || title.includes('course')) {
    icon = <VideoIcon className="w-5 h-5 mr-3 text-red-500" />;
  } else if (title.includes('template') || title.includes('toolkit')) {
    icon = <Download className="w-5 h-5 mr-3 text-green-500" />;
  } else if (title.includes('community') || title.includes('forum')) {
    icon = <Users className="w-5 h-5 mr-3 text-purple-500" />;
  } else if (title.includes('pricing') || title.includes('financial')) {
    icon = <DollarSign className="w-5 h-5 mr-3 text-green-500" />;
  }
  
  return icon;
}

const OpportunityDetailPage = () => {
  const params = useParams();
  const id = params.id;
  const [activeTab, setActiveTab] = useState("overview");
  const [expandedSkill, setExpandedSkill] = useState<number | null>(null);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const { toast } = useToast();

  // This will fetch the actual opportunity data from the API
  // For now we'll use mock data
  const { data: opportunity, isLoading, error } = useQuery<MonetizationOpportunity>({
    queryKey: [`/api/opportunities/${id}`],
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !opportunity) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h2 className="text-2xl font-bold mb-4">Opportunity Not Found</h2>
        <p className="text-neutral-600 mb-6">We couldn't find the opportunity you're looking for.</p>
        <Button asChild>
          <Link href="/saved-opportunities">Back to My Opportunities</Link>
        </Button>
      </div>
    );
  }

  // Parse the opportunity data - from the API
  let parsedOpportunityData: any;
  
  try {
    if (opportunity.opportunityData) {
      parsedOpportunityData = typeof opportunity.opportunityData === 'string' 
        ? JSON.parse(opportunity.opportunityData) 
        : opportunity.opportunityData;
    }
  } catch (error) {
    console.error("Error parsing opportunity data:", error);
  }
  
  const opportunityData: OpportunityDataType = parsedOpportunityData || {
      title: opportunity.title || "Opportunity",
      type: "Freelancing",
      description: "Launch your freelance career using your existing skills to find clients and generate income.",
      incomePotential: "$2000-5000/mo",
      startupCost: "$200-500",
      riskLevel: "low",
      stepsToStart: [
        "Identify your marketable skills and niche",
        "Create a portfolio website showcasing your work",
        "Set up profiles on relevant freelance platforms",
        "Define your service packages and pricing strategy",
        "Develop a client outreach strategy",
        "Start bidding on relevant projects"
      ],
      successStories: [
        {
          name: "Sarah T.",
          background: "Former marketing coordinator who started freelancing on the side",
          journey: "Started with small projects on Upwork while working full-time, gradually built her client base and reputation over 6 months until she had enough steady work to quit her day job.",
          outcome: "Now earns $6,500/month as a full-time freelance content strategist, working with clients she enjoys."
        }
      ],
      resources: [
        {
          title: "The Complete Guide to Freelancing",
          url: "https://www.example.com/freelance-guide",
          source: "Freelancers Union"
        },
        {
          title: "Best Freelance Platforms Comparison",
          url: "https://www.example.com/platforms",
          source: "Side Hustle Nation"
        },
        {
          title: "Pricing Your Freelance Services",
          url: "https://www.example.com/pricing-guide",
          source: "Creative Bloq"
        }
      ],
      roiScore: 85,
      timeToFirstRevenue: "2-4 weeks",
      skillGapDays: 14,
      requiredSkills: [
        "Core skill expertise",
        "Basic marketing",
        "Client communication",
        "Time management",
        "Project scoping",
        "Basic accounting"
      ]
    };

  // Safely get the risk style with a fallback to medium if not found
  const riskStyle = opportunityData.riskLevel && 
    typeof opportunityData.riskLevel === 'string' && 
    opportunityData.riskLevel in riskLevelStyles
      ? riskLevelStyles[opportunityData.riskLevel as keyof typeof riskLevelStyles] 
      : riskLevelStyles.medium;

  const toggleSkillExpand = (index: number) => {
    if (expandedSkill === index) {
      setExpandedSkill(null);
    } else {
      setExpandedSkill(index);
    }
  };

  const toggleVideoPlayer = () => {
    setVideoPlaying(!videoPlaying);
  };

  const handleSaveOpportunity = () => {
    toast({
      title: "Opportunity saved",
      description: "This opportunity has been added to your saved list.",
    });
  };

  const handleAddToActionPlan = () => {
    toast({
      description: "Added to your action plan. View it in the 'Action Plans' section.",
    });
  };

  return (
    <div className="container py-8">
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild className="mb-2">
          <Link href="/saved-opportunities">
            <ArrowRight className="w-4 h-4 mr-1 rotate-180" />
            Back to My Opportunities
          </Link>
        </Button>
        
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">{opportunityData.title}</h1>
            <div className="flex items-center mt-2">
              <Badge variant="outline" className="mr-2 flex items-center">
                {getIconForType(opportunityData.type)}
                <span className="ml-1">{opportunityData.type}</span>
              </Badge>
              {opportunityData.riskLevel && (
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${riskStyle?.bg || ''} ${riskStyle?.text || ''}`}>
                  {riskStyle?.icon}
                  <span className="ml-1">
                    {typeof opportunityData.riskLevel === 'string' && opportunityData.riskLevel.length > 0
                      ? `${opportunityData.riskLevel.charAt(0).toUpperCase()}${opportunityData.riskLevel.slice(1)} Risk`
                      : 'Medium Risk'
                    }
                  </span>
                </span>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleSaveOpportunity}>
              Save Opportunity
            </Button>
            <Button onClick={handleAddToActionPlan}>
              Add to Action Plan
            </Button>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left sidebar with meta information */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>ROI Analysis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center mb-2">
                  <TrendingUp className="w-4 h-4 mr-2 text-primary" />
                  <span className="font-medium">Bang for Buck Score</span>
                  <span className="ml-auto bg-slate-800 text-white px-2 py-0.5 rounded-md text-sm font-medium">
                    {opportunityData.roiScore}/100
                  </span>
                </div>
                <Progress value={opportunityData.roiScore} className="h-2" />
              </div>
              
              <div className="space-y-3 pt-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-neutral-500 flex items-center">
                    <DollarSign className="w-4 h-4 mr-1 text-green-500" />
                    Income Potential
                  </span>
                  <span className="font-medium">{opportunityData.incomePotential}</span>
                </div>
                
                <div className="flex justify-between items-center text-sm">
                  <span className="text-neutral-500 flex items-center">
                    <Building className="w-4 h-4 mr-1 text-blue-500" />
                    Startup Cost
                  </span>
                  <span className="font-medium">{opportunityData.startupCost}</span>
                </div>
                
                <div className="flex justify-between items-center text-sm">
                  <span className="text-neutral-500 flex items-center">
                    <Clock className="w-4 h-4 mr-1 text-amber-500" />
                    Time to Revenue
                  </span>
                  <span className="font-medium">{opportunityData.timeToFirstRevenue}</span>
                </div>
                
                <div className="flex justify-between items-center text-sm">
                  <span className="text-neutral-500 flex items-center">
                    <Target className="w-4 h-4 mr-1 text-purple-500" />
                    Skill Gap
                  </span>
                  <span className="font-medium">~{opportunityData.skillGapDays} days</span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Skills Required</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {opportunityData.requiredSkills?.map((skill, index) => (
                <div key={index} className="text-sm">
                  <div className="flex items-center">
                    <div className={`w-2 h-2 rounded-full ${index < 3 ? 'bg-green-500' : 'bg-amber-500'} mr-2`}></div>
                    <span>{skill}</span>
                  </div>
                </div>
              ))}
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full mt-2" 
                onClick={() => setActiveTab("skills")}
              >
                View Skill Development Plan
              </Button>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Resources</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {opportunityData.resources && Array.isArray(opportunityData.resources) && opportunityData.resources.slice(0, 3).map((resource, index) => (
                <a 
                  key={index}
                  href={resource.url}
                  target="_blank"
                  rel="noopener noreferrer" 
                  className="block p-3 border border-neutral-100 rounded-md hover:border-primary/50 hover:bg-primary/5 transition"
                >
                  <div className="flex items-start">
                    <FileText className="w-4 h-4 mt-0.5 mr-2 text-primary" />
                    <div>
                      <div className="text-sm font-medium">{resource.title}</div>
                      {resource.source && (
                        <div className="text-xs text-neutral-500">{resource.source}</div>
                      )}
                    </div>
                  </div>
                </a>
              ))}
              
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full" 
                onClick={() => setActiveTab("resources")}
              >
                View All Resources
              </Button>
            </CardContent>
          </Card>
        </div>
        
        {/* Main content area */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg overflow-hidden shadow-sm">
            <Tabs
              defaultValue="overview"
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full"
            >
              <TabsList className="grid grid-cols-6 mb-6">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="roi">ROI Analysis</TabsTrigger>
                <TabsTrigger value="pricing">Pricing Calculator</TabsTrigger>
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
                        {opportunityData.stepsToStart && Array.isArray(opportunityData.stepsToStart) && opportunityData.stepsToStart.map((step, index) => (
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
                      {opportunityData.successStories && Array.isArray(opportunityData.successStories) && opportunityData.successStories.map((story, index) => (
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
                            <span className="font-medium">${parseInt(typeof opportunityData.incomePotential === 'string' ? opportunityData.incomePotential.replace(/[^0-9]/g, '') || "0" : "0") * 1.2}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-neutral-600">Monthly Income (Expected)</span>
                            <span className="font-medium">{opportunityData.incomePotential}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-neutral-600">Monthly Income (Conservative)</span>
                            <span className="font-medium">${parseInt(typeof opportunityData.incomePotential === 'string' ? opportunityData.incomePotential.replace(/[^0-9]/g, '') || "0" : "0") * 0.7}</span>
                          </div>
                          <div className="flex justify-between font-medium text-primary pt-2 border-t">
                            <span>Annual Income Potential</span>
                            <span>${parseInt(typeof opportunityData.incomePotential === 'string' ? opportunityData.incomePotential.replace(/[^0-9]/g, '') || "0" : "0") * 12}</span>
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
                            <span className="font-medium">${parseInt(typeof opportunityData.startupCost === 'string' ? opportunityData.startupCost.replace(/[^0-9]/g, '') || "0" : "0") * 0.15}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-neutral-600">Break-even Timeline</span>
                            <span className="font-medium">
                              {parseInt(typeof opportunityData.incomePotential === 'string' ? opportunityData.incomePotential.replace(/[^0-9]/g, '') || "1" : "1") === 0 
                                ? "N/A" 
                                : `${Math.ceil(parseInt(typeof opportunityData.startupCost === 'string' ? opportunityData.startupCost.replace(/[^0-9]/g, '') || "0" : "0") / parseInt(typeof opportunityData.incomePotential === 'string' ? opportunityData.incomePotential.replace(/[^0-9]/g, '') || "1" : "1"))} months`}
                            </span>
                          </div>
                          <div className="flex justify-between font-medium pt-2 border-t">
                            <span>First Year Profit (Est.)</span>
                            <span className="text-green-600">
                              ${parseInt(typeof opportunityData.incomePotential === 'string' ? opportunityData.incomePotential.replace(/[^0-9]/g, '') || "0" : "0") * 12 - parseInt(typeof opportunityData.startupCost === 'string' ? opportunityData.startupCost.replace(/[^0-9]/g, '') || "0" : "0") - (parseInt(typeof opportunityData.startupCost === 'string' ? opportunityData.startupCost.replace(/[^0-9]/g, '') || "0" : "0") * 0.15 * 12)}
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
                            ${Math.round(parseInt(typeof opportunityData.incomePotential === 'string' ? opportunityData.incomePotential.replace(/[^0-9]/g, '') || "0" : "0") / 50)}/hr
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
              
              {/* Pricing Calculator Tab */}
              <TabsContent value="pricing" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Pricing Calculator</CardTitle>
                    <CardDescription>
                      Determine the optimal pricing for your services based on market rates and value
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <h3 className="font-medium border-b pb-2">Your Costs & Time Investment</h3>
                          <div className="space-y-4">
                            <div>
                              <label className="text-sm font-medium mb-1 block">
                                Your Hourly Target Rate
                              </label>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-500">$</span>
                                <input 
                                  type="number" 
                                  defaultValue="50"
                                  className="w-full pl-7 pr-4 py-2 border border-neutral-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                                />
                              </div>
                              <p className="text-xs text-neutral-500 mt-1">What you'd like to earn per hour of work</p>
                            </div>
                            
                            <div>
                              <label className="text-sm font-medium mb-1 block">
                                Estimated Hours Per Project
                              </label>
                              <input 
                                type="number" 
                                defaultValue="10"
                                className="w-full px-4 py-2 border border-neutral-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                              />
                              <p className="text-xs text-neutral-500 mt-1">How long you expect the project to take</p>
                            </div>
                            
                            <div>
                              <label className="text-sm font-medium mb-1 block">
                                Business Expenses (Monthly)
                              </label>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-500">$</span>
                                <input 
                                  type="number" 
                                  defaultValue="250"
                                  className="w-full pl-7 pr-4 py-2 border border-neutral-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                                />
                              </div>
                              <p className="text-xs text-neutral-500 mt-1">Software, tools, marketing, etc.</p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="space-y-4">
                          <h3 className="font-medium border-b pb-2">Market Position</h3>
                          <div className="space-y-4">
                            <div>
                              <label className="text-sm font-medium mb-1 block">
                                Market Position
                              </label>
                              <select 
                                className="w-full px-4 py-2 border border-neutral-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                                defaultValue="mid"
                              >
                                <option value="budget">Budget (Lower Prices)</option>
                                <option value="mid">Mid-Range</option>
                                <option value="premium">Premium (Higher Prices)</option>
                              </select>
                              <p className="text-xs text-neutral-500 mt-1">Where you want to position your offering</p>
                            </div>
                            
                            <div>
                              <label className="text-sm font-medium mb-1 block">
                                Experience Level
                              </label>
                              <select 
                                className="w-full px-4 py-2 border border-neutral-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                                defaultValue="intermediate"
                              >
                                <option value="beginner">Beginner (0-2 years)</option>
                                <option value="intermediate">Intermediate (2-5 years)</option>
                                <option value="advanced">Advanced (5+ years)</option>
                              </select>
                              <p className="text-xs text-neutral-500 mt-1">Your experience in this field</p>
                            </div>
                            
                            <div>
                              <label className="text-sm font-medium mb-1 block">
                                Market Average Rate
                              </label>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-500">$</span>
                                <input 
                                  type="number" 
                                  defaultValue="300"
                                  className="w-full pl-7 pr-4 py-2 border border-neutral-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                                />
                              </div>
                              <p className="text-xs text-neutral-500 mt-1">Average price for similar services</p>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <Separator />
                      
                      <div className="bg-neutral-50 p-6 rounded-lg">
                        <h3 className="font-medium text-lg mb-4">Pricing Recommendation</h3>
                        <div className="grid grid-cols-3 gap-6">
                          <div className="text-center p-4 border border-neutral-200 rounded-lg bg-white">
                            <h4 className="text-sm text-neutral-500 mb-1">Budget Pricing</h4>
                            <p className="text-2xl font-bold text-primary">$250-350</p>
                            <p className="text-xs text-neutral-500 mt-1">More clients, lower margins</p>
                          </div>
                          
                          <div className="text-center p-4 border-2 border-primary rounded-lg bg-white relative">
                            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-primary text-white text-xs px-2 py-1 rounded">
                              Recommended
                            </div>
                            <h4 className="text-sm text-neutral-500 mb-1">Optimal Pricing</h4>
                            <p className="text-2xl font-bold text-primary">$450-550</p>
                            <p className="text-xs text-neutral-500 mt-1">Balanced value & profit</p>
                          </div>
                          
                          <div className="text-center p-4 border border-neutral-200 rounded-lg bg-white">
                            <h4 className="text-sm text-neutral-500 mb-1">Premium Pricing</h4>
                            <p className="text-2xl font-bold text-primary">$650-800</p>
                            <p className="text-xs text-neutral-500 mt-1">Higher quality clients</p>
                          </div>
                        </div>
                        
                        <div className="mt-6">
                          <h4 className="font-medium mb-2">Pricing Strategy Tips</h4>
                          <ul className="space-y-2 text-sm text-neutral-600">
                            <li className="flex items-start">
                              <span className="inline-block w-4 h-4 rounded-full bg-primary/10 text-primary flex-shrink-0 flex items-center justify-center text-xs mr-2 mt-0.5">✓</span>
                              Consider offering tiered packages (Basic, Standard, Premium) to capture different market segments
                            </li>
                            <li className="flex items-start">
                              <span className="inline-block w-4 h-4 rounded-full bg-primary/10 text-primary flex-shrink-0 flex items-center justify-center text-xs mr-2 mt-0.5">✓</span>
                              Value-based pricing often yields better results than hourly-based pricing
                            </li>
                            <li className="flex items-start">
                              <span className="inline-block w-4 h-4 rounded-full bg-primary/10 text-primary flex-shrink-0 flex items-center justify-center text-xs mr-2 mt-0.5">✓</span>
                              Raising your rates by 10-15% for each new client helps you find your market ceiling
                            </li>
                          </ul>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <Button variant="outline">
                          Export Pricing Strategy
                        </Button>
                        <Button>
                          Save Pricing Settings
                        </Button>
                      </div>
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
                      <div className="space-y-4">
                        {opportunityData.requiredSkills?.map((skill, index) => (
                          <div 
                            key={index} 
                            className={cn(
                              "border rounded-lg overflow-hidden transition-all", 
                              expandedSkill === index ? "border-primary" : "border-neutral-200"
                            )}
                          >
                            <div 
                              className="p-4 flex items-center justify-between cursor-pointer"
                              onClick={() => toggleSkillExpand(index)}
                            >
                              <div className="flex items-center">
                                <div className={`w-8 h-8 rounded-full ${index < 3 ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'} flex items-center justify-center mr-3`}>
                                  {index < 3 ? (
                                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <polyline points="20 6 9 17 4 12"></polyline>
                                    </svg>
                                  ) : (
                                    <Target className="w-4 h-4" />
                                  )}
                                </div>
                                <div>
                                  <h4 className="font-medium">{skill}</h4>
                                  <p className="text-xs text-neutral-500">
                                    {index < 3 ? 'You already have this skill' : `Est. ${index * 3 + 4} days to learn basics`}
                                  </p>
                                </div>
                              </div>
                              <ChevronRight className={`w-5 h-5 text-neutral-400 transition-transform ${expandedSkill === index ? 'rotate-90' : ''}`} />
                            </div>
                            
                            {expandedSkill === index && (
                              <div className="px-4 pb-4 pt-2 border-t border-neutral-100">
                                <div className="space-y-4">
                                  <h5 className="text-sm font-medium">Development Path</h5>
                                  <div className="space-y-3">
                                    <div className="flex items-start">
                                      <div className="w-5 h-5 rounded-full bg-neutral-100 flex items-center justify-center text-xs mr-2 mt-0.5">1</div>
                                      <div>
                                        <h6 className="text-sm font-medium">Learn the fundamentals</h6>
                                        <p className="text-xs text-neutral-500">Start with online tutorials and courses to grasp the basics</p>
                                      </div>
                                    </div>
                                    <div className="flex items-start">
                                      <div className="w-5 h-5 rounded-full bg-neutral-100 flex items-center justify-center text-xs mr-2 mt-0.5">2</div>
                                      <div>
                                        <h6 className="text-sm font-medium">Practice on small projects</h6>
                                        <p className="text-xs text-neutral-500">Build a simple portfolio of projects to demonstrate your skills</p>
                                      </div>
                                    </div>
                                    <div className="flex items-start">
                                      <div className="w-5 h-5 rounded-full bg-neutral-100 flex items-center justify-center text-xs mr-2 mt-0.5">3</div>
                                      <div>
                                        <h6 className="text-sm font-medium">Get feedback and improve</h6>
                                        <p className="text-xs text-neutral-500">Share your work with the community to get constructive feedback</p>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="pt-3">
                                    <Button size="sm" variant="outline" className="w-full">
                                      View Learning Resources
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
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
                      Step-by-step guide to achieve success with this opportunity
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      <div className="relative border-l-2 border-primary/30 pl-6 ml-4">
                        {opportunityData.stepsToStart && Array.isArray(opportunityData.stepsToStart) && opportunityData.stepsToStart.length > 0 ? (
                          opportunityData.stepsToStart.map((step, index) => (
                            <div key={index} className="mb-8 relative">
                              <div className="absolute -left-8 w-6 h-6 rounded-full bg-primary flex items-center justify-center text-white text-sm">
                                {index + 1}
                              </div>
                              <h3 className="text-lg font-medium mb-2">{step}</h3>
                              <p className="text-neutral-600 text-sm mb-3">
                                {getStepDescription(index)}
                              </p>
                              <div className="flex flex-wrap gap-2 mt-2">
                                <Badge variant="outline" className="bg-primary/5">Estimated time: {getStepTimeEstimate(index)}</Badge>
                                <Badge variant="outline" className="bg-primary/5">Difficulty: {getStepDifficulty(index)}</Badge>
                              </div>
                              {index < (opportunityData.stepsToStart.length - 1) && (
                                <div className="absolute -left-[0.3rem] bottom-[-1rem] h-8 border-l-2 border-primary/30"></div>
                              )}
                            </div>
                          ))
                        ) : (
                          <div className="py-8 text-center">
                            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-4">
                              <ListChecks className="h-6 w-6 text-primary" />
                            </div>
                            <h3 className="mb-2 text-lg font-medium">Success path coming soon</h3>
                            <p className="text-sm text-neutral-500 max-w-md mx-auto">
                              We're currently developing a detailed step-by-step path to success for this opportunity.
                            </p>
                          </div>
                        )}
                      </div>
                      
                      <div className="mt-6">
                        <Button 
                          className="w-full"
                          onClick={() => {
                            toast({
                              title: "Action plan created",
                              description: "A custom action plan has been created and added to your dashboard.",
                            });
                          }}
                        >
                          Create Custom Action Plan
                        </Button>
                      </div>
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
                      Curated materials to help you succeed with this opportunity
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {opportunityData.resources && Array.isArray(opportunityData.resources) && opportunityData.resources.length > 0 ? (
                          opportunityData.resources.map((resource, index) => (
                            <a 
                              key={index}
                              href={resource.url || "#"}
                              target="_blank"
                              rel="noopener noreferrer" 
                              className="block p-4 border border-neutral-200 rounded-lg hover:border-primary/50 hover:bg-primary/5 transition"
                            >
                              <div className="flex items-start">
                                {getResourceIcon(resource)}
                                <div>
                                  <div className="text-base font-medium">{resource.title || `Resource ${index + 1}`}</div>
                                  {resource.source && (
                                    <div className="text-sm text-neutral-500 mt-1 flex items-center">
                                      <LinkIcon className="w-3.5 h-3.5 mr-1" />
                                      {resource.source}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </a>
                          ))
                        ) : (
                          <div className="col-span-2 py-8 text-center">
                            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-4">
                              <FileText className="h-6 w-6 text-primary" />
                            </div>
                            <h3 className="mb-2 text-lg font-medium">Resources coming soon</h3>
                            <p className="text-sm text-neutral-500 max-w-md mx-auto">
                              We're currently curating a list of valuable resources to help you succeed with this opportunity.
                            </p>
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
                            <Button 
                              size="sm"
                              onClick={() => {
                                toast({
                                  title: "Enrolled successfully",
                                  description: "You have been enrolled in the free course.",
                                });
                              }}
                            >
                              Enroll
                            </Button>
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
                            <Button 
                              size="sm"
                              onClick={() => {
                                toast({
                                  title: "Premium Content",
                                  description: "This is a premium course. Subscribe to access premium content.",
                                  variant: "default"
                                });
                              }}
                            >
                              Enroll
                            </Button>
                          </div>
                        </div>
                      </div>

                      <div className="mt-8">
                        <Button 
                          className="w-full flex items-center justify-center"
                          onClick={() => {
                            toast({
                              title: "Additional resources",
                              description: "We'll notify you when more resources are available for this opportunity.",
                            });
                          }}
                        >
                          Get More Learning Resources
                          <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                      </div>
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