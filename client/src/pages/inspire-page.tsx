import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowRight,
  BookOpen,
  Building,
  Clock,
  DollarSign,
  Filter,
  Gift,
  Home,
  Laptop,
  LayoutList,
  Lightbulb,
  PenTool,
  ScrollText,
  Search,
  Shapes,
  Sparkles,
  Target,
  TrendingUp,
  Users
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useResults } from "@/contexts/ResultsContext";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AnimatePresence, motion } from "framer-motion";
import { Link } from "wouter";

interface OpportunityCardProps {
  opportunity: any;
  index: number;
  priority: string;
  onClick: () => void;
}

const OpportunityCard = ({ opportunity, index, priority, onClick }: OpportunityCardProps) => {
  // Ensure opportunity data is properly extracted
  let opportunityData;
  try {
    opportunityData = opportunity.opportunityData && typeof opportunity.opportunityData === 'string' 
      ? JSON.parse(opportunity.opportunityData) 
      : opportunity.opportunityData || {};
  } catch (error) {
    console.error("Error parsing opportunity data:", error);
    opportunityData = {};
  }
  
  const { title, type, incomePotential, startupCost, riskLevel, roiScore, timeToFirstRevenue, skillGapDays } = opportunityData;
  
  const getBadgeStyle = (type: string) => {
    switch(type?.toLowerCase()) {
      case 'freelance': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'digital product': return 'bg-green-100 text-green-800 border-green-200';
      case 'content': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'service': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'passive': return 'bg-teal-100 text-teal-800 border-teal-200';
      case 'info product': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      default: return 'bg-neutral-100 text-neutral-800 border-neutral-200';
    }
  };
  
  const getIconForType = (type: string) => {
    switch(type?.toLowerCase()) {
      case 'freelance': return <PenTool className="w-3.5 h-3.5" />;
      case 'digital product': return <Laptop className="w-3.5 h-3.5" />;
      case 'content': return <ScrollText className="w-3.5 h-3.5" />;
      case 'service': return <Users className="w-3.5 h-3.5" />;
      case 'passive': return <Building className="w-3.5 h-3.5" />;
      case 'info product': return <BookOpen className="w-3.5 h-3.5" />;
      default: return <Shapes className="w-3.5 h-3.5" />;
    }
  };
  
  const getRiskBadgeStyle = (risk: string) => {
    switch(risk?.toLowerCase()) {
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      case 'medium': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-amber-100 text-amber-800 border-amber-200';
    }
  };
  
  const getPriorityBadgeStyle = (priority: string) => {
    switch(priority?.toLowerCase()) {
      case 'quick win': return 'bg-green-100 text-green-800 border-green-200';
      case 'growth opportunity': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'aspirational path': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'passive income': return 'bg-teal-100 text-teal-800 border-teal-200';
      default: return 'bg-neutral-100 text-neutral-800 border-neutral-200';
    }
  };
  
  const getCardAnimation = () => {
    return {
      initial: { opacity: 0, y: 20 },
      animate: { 
        opacity: 1, 
        y: 0,
        transition: { 
          delay: index * 0.1,
          duration: 0.4,
        }
      },
      exit: { opacity: 0, y: -20 }
    };
  };
  
  return (
    <motion.div {...getCardAnimation()}>
      <Card 
        className="h-full cursor-pointer hover:shadow-md transition-all duration-300 border-2 hover:border-primary/40" 
        onClick={onClick}
      >
        <CardHeader className="p-4 pb-0">
          <div className="flex justify-between items-start mb-2">
            <Badge variant="outline" className={`${getBadgeStyle(type)} mr-2 flex items-center gap-1`}>
              {getIconForType(type)}
              <span>{type || 'Opportunity'}</span>
            </Badge>
            
            <Badge variant="outline" className={getPriorityBadgeStyle(priority)}>
              {priority}
            </Badge>
          </div>
          
          <CardTitle className="text-xl leading-tight mb-1">
            {title || 'Untitled Opportunity'}
          </CardTitle>
          
          <div className="flex items-center mt-1 gap-2">
            <div className="flex items-center mr-2">
              <TrendingUp className="w-3.5 h-3.5 mr-1 text-primary" />
              <span className="text-xs font-medium">ROI: {roiScore || 75}/100</span>
            </div>
            
            <div className="flex items-center">
              <DollarSign className="w-3.5 h-3.5 mr-1 text-green-500" />
              <span className="text-xs">{incomePotential || '$500-1000/month'}</span>
            </div>
            
            <Badge variant="outline" className={`${getRiskBadgeStyle(riskLevel)} text-xs`}>
              {riskLevel ? `${riskLevel} Risk` : 'Medium Risk'}
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
              <span className="font-medium">{timeToFirstRevenue || '1-4 weeks'}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-neutral-500 flex items-center">
                <Building className="w-3.5 h-3.5 mr-1 text-blue-500" />
                Startup Cost
              </span>
              <span className="font-medium">{startupCost || '$0-100'}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-neutral-500 flex items-center">
                <Target className="w-3.5 h-3.5 mr-1 text-purple-500" />
                Skill Gap
              </span>
              <span className="font-medium">~{skillGapDays || 14} days</span>
            </div>
          </div>
          
          <Button 
            className="w-full mt-4" 
            size="sm" 
            onClick={(e) => {
              e.preventDefault(); // Prevent default behavior
              e.stopPropagation(); // Prevent the card click handler from firing
              onClick(); // Call the parent component's click handler
            }}
          >
            View Details
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
};

const FilterSection = ({ activeFilter, setActiveFilter }: { activeFilter: string, setActiveFilter: (filter: string) => void }) => {
  const filters = [
    { id: 'all', label: 'All Opportunities', icon: <Shapes className="w-4 h-4 mr-2" /> },
    { id: 'quick-wins', label: 'Quick Wins', icon: <Sparkles className="w-4 h-4 mr-2" /> },
    { id: 'growth', label: 'Growth Opportunities', icon: <TrendingUp className="w-4 h-4 mr-2" /> },
    { id: 'aspirational', label: 'Aspirational Paths', icon: <Target className="w-4 h-4 mr-2" /> },
    { id: 'passive', label: 'Passive Income', icon: <Gift className="w-4 h-4 mr-2" /> },
  ];
  
  return (
    <div className="mb-6">
      <div className="flex items-center mb-2">
        <Filter className="w-4 h-4 mr-2 text-neutral-500" />
        <h3 className="font-medium">Filter Results</h3>
      </div>
      <div className="flex flex-wrap gap-2">
        {filters.map(filter => (
          <Button
            key={filter.id}
            variant={activeFilter === filter.id ? "default" : "outline"}
            size="sm"
            className="flex items-center"
            onClick={() => setActiveFilter(filter.id)}
          >
            {filter.icon}
            {filter.label}
          </Button>
        ))}
      </div>
    </div>
  );
};

export default function InspirePage() {
  const [activeFilter, setActiveFilter] = useState('all');
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  // Get results directly from context
  const { results, setSource } = useResults();
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    // Short delay to allow for any async operations
    const timer = setTimeout(() => {
      setIsLoading(false);
      
      // Show toast if no results are found
      if (!results) {
        toast({
          title: "No search results found",
          description: "Try starting a new search from the home page.",
          variant: "destructive",
        });
      }
    }, 300);
    
    return () => clearTimeout(timer);
  }, [results, toast]);
  
  // Function to handle opportunity card click
  const handleOpportunityClick = (opportunity: any) => {
    if (!opportunity || !opportunity.id) return;
    
    // Set source to 'inspire' to help with back navigation
    setSource('inspire');
    
    // Navigate to the opportunity detail page
    setLocation(`/opportunity/${opportunity.id}`);
  };
  
  // Filter opportunities based on active filter
  const getPriorityForOpportunity = (opportunity: any): string => {
    if (!opportunity) return 'Opportunity';
    
    const score = opportunity.score || 0;
    // Safely parse opportunity data with error handling
    let data = {};
    try {
      data = opportunity.opportunityData && typeof opportunity.opportunityData === 'string'
        ? JSON.parse(opportunity.opportunityData)
        : opportunity.opportunityData || {};
    } catch (error) {
      console.error("Error parsing opportunity data for priority:", error);
      // Continue with empty data object
    }
    
    const riskLevel = (data.riskLevel || '').toLowerCase();
    const timeToRevenue = data.timeToFirstRevenue || '';
    const skillGapDays = data.skillGapDays || 0;
    
    // Quick Win: High score, low risk, quick revenue
    if (score > 80 && riskLevel === 'low' && timeToRevenue.includes('week') && skillGapDays < 14) {
      return 'Quick Win';
    }
    
    // Passive Income: Contains passive income indicators
    if (data.type === 'PASSIVE' || data.type === 'Passive') {
      return 'Passive Income';
    }
    
    // Aspirational Path: High skill gap, high income potential
    if (skillGapDays > 30 && (data.incomePotential || '').includes('$5,000')) {
      return 'Aspirational Path';
    }
    
    // Default is Growth Opportunity
    return 'Growth Opportunity';
  };
  
  const getFilteredOpportunities = () => {
    if (!results || !results.opportunities || !Array.isArray(results.opportunities)) {
      return [];
    }
    
    return results.opportunities.filter((opportunity: any) => {
      const priority = getPriorityForOpportunity(opportunity).toLowerCase().replace(' ', '-');
      
      if (activeFilter === 'all') return true;
      if (activeFilter === 'quick-wins' && priority === 'quick-win') return true;
      if (activeFilter === 'growth' && priority === 'growth-opportunity') return true;
      if (activeFilter === 'aspirational' && priority === 'aspirational-path') return true;
      if (activeFilter === 'passive' && priority === 'passive-income') return true;
      
      return false;
    });
  };
  
  const filteredOpportunities = getFilteredOpportunities();
  
  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4 sm:px-6">
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-neutral-100 rounded w-1/3"></div>
          <div className="h-6 bg-neutral-100 rounded w-1/2"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-64 bg-neutral-100 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }
  
  if (!results || !results.opportunities || !Array.isArray(results.opportunities) || results.opportunities.length === 0) {
    return (
      <div className="container mx-auto py-8 px-4 sm:px-6">
        <div className="text-center p-8 border rounded-lg">
          <Lightbulb className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">No Opportunities Found</h2>
          <p className="text-neutral-600 mb-6">
            We couldn't find any monetization opportunities matching your search criteria.
          </p>
          <Button asChild>
            <Link href="/">
              <Search className="w-4 h-4 mr-2" />
              Start a New Search
            </Link>
          </Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-8 px-4 sm:px-6">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Monetization Opportunities</h1>
          <p className="text-neutral-600 mt-2">
            Discover ways to monetize your skills based on your profile and preferences.
          </p>
        </div>
        
        <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg">
          <div className="flex items-start">
            <Lightbulb className="w-6 h-6 text-amber-500 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h3 className="font-medium text-lg mb-1">
                We've found {results.opportunities.length} opportunity matches for you
              </h3>
              <p className="text-neutral-700">
                These opportunities are matched to your skills in {results.userProfile?.skills?.join(', ')} 
                and your preference for {results.userProfile?.timeAvailability} time commitment 
                with {results.userProfile?.riskTolerance} risk tolerance.
              </p>
            </div>
          </div>
        </div>
        
        <FilterSection activeFilter={activeFilter} setActiveFilter={setActiveFilter} />
        
        <AnimatePresence>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredOpportunities.map((opportunity: any, index: number) => (
              <OpportunityCard 
                key={opportunity.id || index}
                opportunity={opportunity}
                index={index}
                priority={getPriorityForOpportunity(opportunity)}
                onClick={() => handleOpportunityClick(opportunity)}
              />
            ))}
          </div>
        </AnimatePresence>
        
        {filteredOpportunities.length === 0 && (
          <div className="text-center p-8 border rounded-lg">
            <Filter className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
            <h2 className="text-xl font-medium mb-2">No Matches for This Filter</h2>
            <p className="text-neutral-600 mb-4">
              Try selecting a different filter to see more opportunities.
            </p>
            <Button variant="outline" onClick={() => setActiveFilter('all')}>
              View All Opportunities
            </Button>
          </div>
        )}
        
        <div className="flex justify-between mt-8">
          <Button variant="outline" asChild>
            <Link href="/">
              <Home className="w-4 h-4 mr-2" />
              Back to Home
            </Link>
          </Button>
          
          <Button asChild>
            <Link href="/saved-opportunities">
              View Saved Opportunities
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}