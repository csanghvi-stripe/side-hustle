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
  Check,
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
  Info,
  Laptop,
  LayoutDashboard,
  LayoutList,
  Lightbulb,
  Link as LinkIcon,
  ListChecks,
  ListOrdered,
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
import { useState, useEffect } from "react";
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
    icon: <HelpCircle className="w-4 h-4" />,
  },
};

// Function to get step description based on index
function getStepDescription(index: number): string {
  const descriptions = [
    "This step lays the foundation for your success. Take your time to get it right.",
    "Focus on quality over speed in this critical step.",
    "This step is essential for establishing your brand and services.",
    "This step will help you stand out from the competition.",
    "This step is where you'll start to see real traction.",
    "Don't rush this step - it builds credibility for future growth.",
    "This step provides the framework for scaling your income.",
    "Many people skip this step, but it's crucial for long-term success.",
  ];
  
  return descriptions[index % descriptions.length];
}

// Function to estimate time for each step
function getStepTimeEstimate(index: number): string {
  const estimates = [
    "1-2 days", 
    "3-5 days", 
    "1 week", 
    "2-3 days", 
    "1-2 weeks", 
    "2-3 hours", 
    "4-6 hours", 
    "1 day"
  ];
  
  return estimates[index % estimates.length];
}

// Function to get difficulty level for each step
function getStepDifficulty(index: number): string {
  const difficulties = ["Easy", "Medium", "Hard", "Easy", "Medium", "Easy", "Medium", "Hard"];
  return difficulties[index % difficulties.length];
}

// Function to get appropriate icon based on resource type
function getResourceIcon(resource: ResourceType) {
  if (resource.title?.toLowerCase().includes('guide') || resource.title?.toLowerCase().includes('tutorial')) {
    return <BookOpen className="w-4 h-4 text-primary" />;
  } else if (resource.title?.toLowerCase().includes('video') || resource.title?.toLowerCase().includes('course')) {
    return <VideoIcon className="w-4 h-4 text-primary" />;
  } else if (resource.title?.toLowerCase().includes('template') || resource.title?.toLowerCase().includes('checklist')) {
    return <Clipboard className="w-4 h-4 text-primary" />;
  } else if (resource.title?.toLowerCase().includes('tool') || resource.title?.toLowerCase().includes('software')) {
    return <Laptop className="w-4 h-4 text-primary" />;
  } else if (resource.title?.toLowerCase().includes('community') || resource.title?.toLowerCase().includes('forum')) {
    return <Users className="w-4 h-4 text-primary" />;
  } else {
    return <FileText className="w-4 h-4 text-primary" />;
  }
}

export default function OpportunityDetailPage() {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState("overview");
  const [videoPlaying, setVideoPlaying] = useState(false);
  const { toast } = useToast();
  
  // Check if we are coming from the saved opportunities page or the discover page
  const [isFromSaved, setIsFromSaved] = useState(false);
  
  // Check the stored navigation context when the component mounts
  useEffect(() => {
    // First check localStorage (most reliable method)
    const opportunitySource = localStorage.getItem('opportunitySource');
    if (opportunitySource === 'saved') {
      setIsFromSaved(true);
    } else if (opportunitySource === 'search') {
      setIsFromSaved(false);
    } else {
      // Fallback to checking document.referrer
      const referrer = document.referrer;
      if (referrer && (referrer.includes('/saved-opportunities') || referrer.includes('/saved'))) {
        setIsFromSaved(true);
      }
    }
  }, []);
  
  // Fetch opportunity data
  const { data: opportunity, isLoading, error } = useQuery({
    queryKey: [`/api/opportunities/${id}`],
    enabled: !!id,
  });
  
  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4 sm:px-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-neutral-100 rounded w-2/3"></div>
          <div className="h-64 bg-neutral-100 rounded"></div>
          <div className="h-32 bg-neutral-100 rounded"></div>
        </div>
      </div>
    );
  }
  
  if (error || !opportunity) {
    return (
      <div className="container mx-auto py-8 px-4 sm:px-6">
        <h1 className="text-2xl font-bold mb-4">Opportunity not found</h1>
        <p className="text-neutral-600">
          The opportunity you're looking for doesn't exist or has been removed.
        </p>
        <Button variant="outline" className="mt-4" asChild>
          <Link href="/">
            <ArrowRight className="w-4 h-4 mr-1 rotate-180" />
            Back to Opportunities
          </Link>
        </Button>
      </div>
    );
  }
  
  // Parse opportunity data from JSON if needed
  let opportunityData: OpportunityDataType;
  
  try {
    if (typeof opportunity.opportunityData === 'string') {
      opportunityData = JSON.parse(opportunity.opportunityData);
    } else {
      opportunityData = opportunity.opportunityData as any;
    }
  } catch {
    // Fallback if parsing fails
    opportunityData = {
      title: opportunity.title || 'Untitled Opportunity',
      type: 'Freelance',
      description: 'No detailed description available for this opportunity.',
      incomePotential: '$1,000-$5,000/month',
      startupCost: '$0-$100',
      riskLevel: 'Medium',
      stepsToStart: ['Research and identify your target market', 'Set up your portfolio or storefront', 'Create your service offerings'],
      resources: [],
      roiScore: 75,
      timeToFirstRevenue: '2-4 weeks',
      skillGapDays: 14,
      requiredSkills: ['Communication', 'Time management', 'Marketing'],
    };
  }
  
  // Make sure opportunityData and riskLevel exist before accessing
  const riskStyle = opportunityData && opportunityData.riskLevel ? 
    riskLevelStyles[(opportunityData.riskLevel.toString().toLowerCase()) as keyof typeof riskLevelStyles] || riskLevelStyles.medium : 
    riskLevelStyles.medium;

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
    if (!id || !opportunityData) return;
    
    // Store opportunity name in localStorage for the action plan page to use
    if (opportunityData.title) {
      localStorage.setItem(`opportunity_${id}_name`, opportunityData.title);
    }
    
    // Navigate to the action plan page with the opportunity ID
    window.location.href = `/action-plan?opportunityId=${id}`;
    
    toast({
      title: "Creating action plan",
      description: "Taking you to the action plan generator for this opportunity.",
    });
  };

  return (
    <div className="container max-w-6xl mx-auto py-8 px-4 sm:px-6">
      <div className="mb-6">
        <div className="flex space-x-4 mb-4">
          {/* Show different back buttons based on where the user came from */}
          <Button 
            variant="ghost" 
            size="sm" 
            asChild
            onClick={() => {
              // Clear the source from localStorage when navigating back
              localStorage.removeItem('opportunitySource');
            }}
          >
            <Link href={isFromSaved ? "/saved-opportunities" : "/"}>
              <ArrowRight className="w-4 h-4 mr-1 rotate-180" />
              {isFromSaved ? "Back to Saved Opportunities" : "Back to Search Results"}
            </Link>
          </Button>
        </div>
        
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">{opportunityData?.title || 'Opportunity Details'}</h1>
            <div className="flex items-center mt-2">
              <Badge variant="outline" className="mr-2 flex items-center">
                {getIconForType(opportunityData?.type || 'FREELANCE')}
                <span className="ml-1">{opportunityData?.type || 'Opportunity'}</span>
              </Badge>
              {opportunityData?.riskLevel && (
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
                    {opportunityData?.roiScore || 75}/100
                  </span>
                </div>
                <Progress value={opportunityData?.roiScore || 75} className="h-2" />
              </div>
              
              <div className="space-y-3 pt-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-neutral-500 flex items-center">
                    <DollarSign className="w-4 h-4 mr-1 text-green-500" />
                    Income Potential
                  </span>
                  <span className="font-medium">{opportunityData?.incomePotential || '$500-1000/month'}</span>
                </div>
                
                <div className="flex justify-between items-center text-sm">
                  <span className="text-neutral-500 flex items-center">
                    <Building className="w-4 h-4 mr-1 text-blue-500" />
                    Startup Cost
                  </span>
                  <span className="font-medium">{opportunityData?.startupCost || '$0-100'}</span>
                </div>
                
                <div className="flex justify-between items-center text-sm">
                  <span className="text-neutral-500 flex items-center">
                    <Clock className="w-4 h-4 mr-1 text-amber-500" />
                    Time to Revenue
                  </span>
                  <span className="font-medium">{opportunityData?.timeToFirstRevenue || '1-4 weeks'}</span>
                </div>
                
                <div className="flex justify-between items-center text-sm">
                  <span className="text-neutral-500 flex items-center">
                    <Target className="w-4 h-4 mr-1 text-purple-500" />
                    Skill Gap
                  </span>
                  <span className="font-medium">~{opportunityData?.skillGapDays || 14} days</span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Skills Required</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {opportunityData?.requiredSkills?.map((skill, index) => (
                <div key={index} className="text-sm">
                  <div className="flex items-center">
                    <div className={`w-2 h-2 rounded-full ${index < 3 ? 'bg-green-500' : 'bg-amber-500'} mr-2`}></div>
                    <span>{skill}</span>
                  </div>
                </div>
              ))}
              {(!opportunityData?.requiredSkills || opportunityData.requiredSkills.length === 0) && (
                <div className="text-sm text-neutral-500">No specific skills required</div>
              )}
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
              {opportunityData?.resources && Array.isArray(opportunityData.resources) && opportunityData.resources.slice(0, 3).map((resource, index) => (
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
              {(!opportunityData?.resources || !Array.isArray(opportunityData.resources) || opportunityData.resources.length === 0) && (
                <div className="text-sm text-neutral-500">Resources will be available soon</div>
              )}
              
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
                      {opportunityData?.description || "This opportunity allows you to leverage your skills to generate income with minimal startup costs and a quick path to revenue."}
                    </p>
                    
                    <div className="mt-6 space-y-6">
                      <div className="p-4 bg-primary/5 rounded-lg border border-primary/10">
                        <h3 className="font-medium text-base mb-3 flex items-center">
                          <Lightbulb className="w-5 h-5 mr-2 text-amber-500" />
                          What Makes This Opportunity Great
                        </h3>
                        <ul className="space-y-2 ml-2">
                          <li className="flex items-start">
                            <Check className="w-4 h-4 text-green-500 mr-2 mt-1 flex-shrink-0" />
                            <p className="text-neutral-700 text-sm">
                              <span className="font-medium">Low barrier to entry:</span> You can start with minimal investment and existing skills.
                            </p>
                          </li>
                          <li className="flex items-start">
                            <Check className="w-4 h-4 text-green-500 mr-2 mt-1 flex-shrink-0" />
                            <p className="text-neutral-700 text-sm">
                              <span className="font-medium">Flexible scaling:</span> Start small and grow as your skills and client base develop.
                            </p>
                          </li>
                          <li className="flex items-start">
                            <Check className="w-4 h-4 text-green-500 mr-2 mt-1 flex-shrink-0" />
                            <p className="text-neutral-700 text-sm">
                              <span className="font-medium">Direct monetization:</span> Your skills translate directly to income without complex business structures.
                            </p>
                          </li>
                          <li className="flex items-start">
                            <Check className="w-4 h-4 text-green-500 mr-2 mt-1 flex-shrink-0" />
                            <p className="text-neutral-700 text-sm">
                              <span className="font-medium">Growing market:</span> Increasing demand for {opportunityData?.type ? opportunityData.type.toLowerCase() : 'these'} services across industries.
                            </p>
                          </li>
                        </ul>
                      </div>
                      
                      <div>
                        <h3 className="font-medium text-base mb-3 flex items-center">
                          <ListOrdered className="w-5 h-5 mr-2 text-primary" />
                          Steps to Start
                        </h3>
                        <ol className="space-y-3">
                          {opportunityData?.stepsToStart && Array.isArray(opportunityData.stepsToStart) && opportunityData.stepsToStart.map((step, index) => (
                            <li key={index} className="flex">
                              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center mr-3 mt-0.5">
                                {index + 1}
                              </div>
                              <div>
                                <p className="text-neutral-700">{step}</p>
                                <p className="text-xs text-neutral-500 mt-1">
                                  Estimated time: {getStepTimeEstimate(index)} • Difficulty: {getStepDifficulty(index)}
                                </p>
                              </div>
                            </li>
                          ))}
                          {(!opportunityData?.stepsToStart || !Array.isArray(opportunityData.stepsToStart) || opportunityData.stepsToStart.length === 0) && (
                            <li className="text-sm text-neutral-500">
                              Detailed steps to start will be available soon
                            </li>
                          )}
                        </ol>
                      </div>
                      
                      <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                        <h3 className="font-medium text-base mb-3 flex items-center text-blue-700">
                          <Info className="w-5 h-5 mr-2 text-blue-500" />
                          How to Maximize Success
                        </h3>
                        <ul className="space-y-2 ml-2">
                          <li className="flex items-start">
                            <ArrowRight className="w-4 h-4 text-blue-500 mr-2 mt-1 flex-shrink-0" />
                            <p className="text-neutral-700 text-sm">
                              Focus on a specific niche rather than being a generalist to command higher rates.
                            </p>
                          </li>
                          <li className="flex items-start">
                            <ArrowRight className="w-4 h-4 text-blue-500 mr-2 mt-1 flex-shrink-0" />
                            <p className="text-neutral-700 text-sm">
                              Build a strong portfolio with quality examples of your best work.
                            </p>
                          </li>
                          <li className="flex items-start">
                            <ArrowRight className="w-4 h-4 text-blue-500 mr-2 mt-1 flex-shrink-0" />
                            <p className="text-neutral-700 text-sm">
                              Consistently deliver exceptional work to get referrals and repeat business.
                            </p>
                          </li>
                          <li className="flex items-start">
                            <ArrowRight className="w-4 h-4 text-blue-500 mr-2 mt-1 flex-shrink-0" />
                            <p className="text-neutral-700 text-sm">
                              Gradually increase your rates as you gain experience and client testimonials.
                            </p>
                          </li>
                        </ul>
                      </div>
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
                        {opportunityData?.roiScore || 75}/100
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
                          <span className="font-medium">{opportunityData?.incomePotential || '$500-1000/month'}</span>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <p className="text-sm text-neutral-500">Initial Investment</p>
                        <div className="flex items-center">
                          <Building className="w-5 h-5 text-blue-500 mr-1" />
                          <span className="font-medium">{opportunityData?.startupCost || '$0-100'}</span>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <p className="text-sm text-neutral-500">Time to First Revenue</p>
                        <div className="flex items-center">
                          <Clock className="w-5 h-5 text-amber-500 mr-1" />
                          <span className="font-medium">{opportunityData?.timeToFirstRevenue || '1-4 weeks'}</span>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <p className="text-sm text-neutral-500">Risk Level</p>
                        <div className="flex items-center">
                          <Target className="w-5 h-5 text-red-500 mr-1" />
                          <span className="font-medium">
                            {opportunityData?.riskLevel && typeof opportunityData.riskLevel === 'string' && opportunityData.riskLevel.length > 0
                              ? `${opportunityData.riskLevel.charAt(0).toUpperCase()}${opportunityData.riskLevel.slice(1)}`
                              : 'Medium'
                            }
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-6">
                      <h4 className="text-sm font-medium mb-2">Factors Affecting ROI</h4>
                      <ul className="space-y-2">
                        <li className="text-sm flex items-start">
                          <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 mr-2"></div>
                          <span><span className="font-medium">Low startup costs:</span> minimal initial investment required means faster profitability.</span>
                        </li>
                        <li className="text-sm flex items-start">
                          <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 mr-2"></div>
                          <span><span className="font-medium">Flexible time commitment:</span> scale your efforts based on availability and return.</span>
                        </li>
                        <li className="text-sm flex items-start">
                          <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 mr-2"></div>
                          <span><span className="font-medium">Market competition:</span> moderate competition requires strategic positioning.</span>
                        </li>
                        <li className="text-sm flex items-start">
                          <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 mr-2"></div>
                          <span><span className="font-medium">Rapid scaling potential:</span> ability to increase rates and clients over time.</span>
                        </li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              {/* Other tab contents would be here */}
              <TabsContent value="roi" className="p-6">
                <h3 className="text-lg font-medium mb-4">ROI Analysis Coming Soon</h3>
                <p className="text-neutral-600">
                  Detailed financial projections and ROI analysis for this opportunity will be available soon.
                </p>
              </TabsContent>
              
              <TabsContent value="pricing" className="p-6">
                <h3 className="text-lg font-medium mb-4">Pricing Calculator Coming Soon</h3>
                <p className="text-neutral-600">
                  Interactive pricing calculator for this opportunity will be available soon.
                </p>
              </TabsContent>
              
              <TabsContent value="skills" className="p-6">
                <h3 className="text-lg font-medium mb-4">Skill Development Plan Coming Soon</h3>
                <p className="text-neutral-600">
                  Detailed skill development roadmap for this opportunity will be available soon.
                </p>
              </TabsContent>
              
              <TabsContent value="steps" className="p-6">
                <h3 className="text-lg font-medium mb-4">Success Path Coming Soon</h3>
                <p className="text-neutral-600">
                  Detailed step-by-step success path for this opportunity will be available soon.
                </p>
              </TabsContent>
              
              <TabsContent value="resources" className="p-6">
                <h3 className="text-lg font-medium mb-4">Resources Coming Soon</h3>
                <p className="text-neutral-600">
                  Curated resources for this opportunity will be available soon.
                </p>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}