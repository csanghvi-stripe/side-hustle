import React, { useState, useEffect } from 'react';
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  AlertCircle, 
  CheckCircle, 
  ChevronRight, 
  BarChart, 
  TrendingUp, 
  BookOpen, 
  Code,
  Zap,
  CircleDollarSign,
  Clock,
  Target,
  Lightbulb,
  GraduationCap,
  Briefcase,
  Users
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Link } from "wouter";

interface SkillGapProps {
  opportunity: any;
  userSkills?: string[];
}

interface Skill {
  name: string;
  requiredLevel: number;
  userLevel: number;
  importance: number;
  learningTimeHours: number;
  recommendedResources?: {
    title: string;
    url: string;
    type: 'course' | 'tutorial' | 'tool' | 'book' | 'community';
  }[];
}

interface OpportunityROI {
  opportunityId: string | number;
  name: string;
  potentialEarnings: number;
  timeToFirstRevenue: number;
  initialInvestment: number;
  skillGapClosureTime: number;
  riskLevel: 'low' | 'medium' | 'high';
  roiScore: number;
}

export default function SkillGapAnalyzer({ opportunity, userSkills = [] }: SkillGapProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showDetailed, setShowDetailed] = useState(false);
  
  // Extract required skills from the opportunity
  // This would be more sophisticated in a real implementation
  const requiredSkills: Skill[] = React.useMemo(() => {
    // For demonstration purposes, generate required skills based on opportunity type
    const opportunityData = opportunity?.opportunityData || {};
    const title = opportunityData?.title || '';
    const description = opportunityData?.description || '';
    const type = opportunityData?.type || '';
    
    // Extract skill names from title and description
    const extractedSkills = new Set<string>();
    const allText = `${title} ${description}`.toLowerCase();
    
    // Common skills that might be mentioned
    const skillKeywords = [
      'writing', 'design', 'development', 'marketing', 'teaching',
      'coaching', 'consulting', 'programming', 'analysis', 'research',
      'content creation', 'social media', 'photography', 'editing',
      'seo', 'sales', 'communication', 'presentation', 'negotiation'
    ];
    
    // Check which skills are mentioned
    skillKeywords.forEach(skill => {
      if (allText.includes(skill.toLowerCase())) {
        extractedSkills.add(skill);
      }
    });
    
    // Add type-specific skills
    switch(type) {
      case 'Freelance':
        extractedSkills.add('client management');
        extractedSkills.add('time management');
        break;
      case 'Digital Product':
        extractedSkills.add('product development');
        extractedSkills.add('marketing');
        break;
      case 'Content Creation':
        extractedSkills.add('content strategy');
        extractedSkills.add('audience building');
        break;
      case 'Service-Based':
        extractedSkills.add('service delivery');
        extractedSkills.add('customer service');
        break;
      case 'Passive Income':
        extractedSkills.add('automation');
        extractedSkills.add('systems thinking');
        break;
    }
    
    // Map to Skill objects
    return Array.from(extractedSkills).map(skillName => {
      // Check if user has this skill
      const userHasSkill = userSkills.some(s => 
        s.toLowerCase().includes(skillName.toLowerCase())
      );
      
      // Generate random required level (3-5) and user level (1-5)
      const requiredLevel = Math.floor(Math.random() * 3) + 3; // 3-5
      const userLevel = userHasSkill 
        ? Math.floor(Math.random() * 3) + 2 // If user has skill: 2-4
        : Math.floor(Math.random() * 2) + 1; // If user doesn't have skill: 1-2
        
      // Generate random importance and learning time
      const importance = Math.floor(Math.random() * 5) + 1; // 1-5
      const learningTimeHours = (requiredLevel - userLevel) * (Math.floor(Math.random() * 10) + 5); // 5-14 hours per level difference
      
      // Sample resources
      let recommendedResources;
      if (requiredLevel > userLevel) {
        recommendedResources = [
          {
            title: `${skillName.charAt(0).toUpperCase() + skillName.slice(1)} Fundamentals`,
            url: '#',
            type: 'course' as const
          },
          {
            title: `Practical ${skillName.charAt(0).toUpperCase() + skillName.slice(1)}`,
            url: '#',
            type: 'tutorial' as const
          }
        ];
      }
      
      return {
        name: skillName,
        requiredLevel,
        userLevel,
        importance,
        learningTimeHours,
        recommendedResources
      };
    });
  }, [opportunity, userSkills]);
  
  // Calculate ROI and opportunity score
  const opportunityAnalysis: OpportunityROI = React.useMemo(() => {
    // Extract income potential and startup cost from opportunity
    const opportunityData = opportunity?.opportunityData || {};
    const incomePotentialText = opportunityData?.incomePotential || '$0-$0';
    const startupCostText = opportunityData?.startupCost || '$0';
    
    // Parse income potential range (e.g., "$1,000-$5,000/month" -> average to 3000)
    const incomeMatch = incomePotentialText.match(/\$([0-9,]+)(?:-\$([0-9,]+))?/);
    const minIncome = incomeMatch && incomeMatch[1] ? parseInt(incomeMatch[1].replace(/,/g, '')) : 0;
    const maxIncome = incomeMatch && incomeMatch[2] ? parseInt(incomeMatch[2].replace(/,/g, '')) : minIncome;
    const avgMonthlyIncome = (minIncome + maxIncome) / 2;
    
    // Parse startup cost (e.g., "$500" -> 500)
    const costMatch = startupCostText.match(/\$([0-9,]+)/);
    const initialInvestment = costMatch ? parseInt(costMatch[1].replace(/,/g, '')) : 0;
    
    // Calculate skill gap and time to close the gap
    const skillsNeedingWork = requiredSkills.filter(skill => skill.requiredLevel > skill.userLevel);
    const totalGapClosureHours = skillsNeedingWork.reduce((sum, skill) => 
      sum + skill.learningTimeHours, 0);
    
    // Assuming 2 hours per day for skill improvement
    const skillGapClosureTime = Math.ceil(totalGapClosureHours / 2);
    
    // Estimate time to first revenue based on opportunity type
    let timeToFirstRevenue = 30; // Default 30 days
    const oppType = opportunityData?.type || '';
    if (oppType === 'Freelance') timeToFirstRevenue = 14;
    else if (oppType === 'Service-Based') timeToFirstRevenue = 21;
    else if (oppType === 'Digital Product') timeToFirstRevenue = 60;
    else if (oppType === 'Passive Income') timeToFirstRevenue = 90;
    
    // Adjust based on skill gap
    timeToFirstRevenue += skillGapClosureTime;
    
    // Parse risk level
    const riskLevel = typeof opportunityData?.riskLevel === 'string' 
      ? opportunityData.riskLevel.toLowerCase() as 'low' | 'medium' | 'high'
      : 'medium';
    
    // Calculate ROI score (0-100)
    // Factors: expected income, startup cost, time to revenue, skill gap
    const incomeScore = Math.min(avgMonthlyIncome / 5000, 1) * 40; // 40% weight to income potential
    const investmentScore = Math.max(1 - (initialInvestment / 2000), 0) * 20; // 20% weight to low investment
    const timeScore = Math.max(1 - (timeToFirstRevenue / 180), 0) * 25; // 25% weight to quick returns
    const skillScore = Math.max(1 - (skillGapClosureTime / 60), 0) * 15; // 15% weight to skill readiness
    
    const roiScore = Math.round(incomeScore + investmentScore + timeScore + skillScore);
    
    return {
      opportunityId: opportunity?.id || 0,
      name: opportunityData?.title || 'Opportunity',
      potentialEarnings: avgMonthlyIncome,
      timeToFirstRevenue,
      initialInvestment,
      skillGapClosureTime,
      riskLevel,
      roiScore
    };
  }, [opportunity, requiredSkills]);
  
  // Get the skill gap color based on difference
  const getSkillGapColor = (required: number, user: number) => {
    const gap = required - user;
    if (gap <= 0) return 'bg-green-500';
    if (gap === 1) return 'bg-yellow-500';
    return 'bg-red-500';
  };
  
  // Get the resource icon based on type
  const getResourceIcon = (type: string) => {
    switch(type) {
      case 'course':
        return <GraduationCap className="h-4 w-4" />;
      case 'tutorial':
        return <BookOpen className="h-4 w-4" />;
      case 'tool':
        return <Code className="h-4 w-4" />;
      case 'book':
        return <BookOpen className="h-4 w-4" />;
      case 'community':
        return <Users className="h-4 w-4" />;
      default:
        return <Lightbulb className="h-4 w-4" />;
    }
  };
  
  // Get ROI score indicator
  const getRoiScoreClass = (score: number) => {
    if (score >= 75) return 'text-green-500';
    if (score >= 50) return 'text-yellow-500';
    return 'text-red-500';
  };
  
  // Create action plan for this opportunity
  const handleCreateActionPlan = () => {
    // Navigate to the action plan generator with this opportunity ID
    window.location.href = `/action-plan?opportunityId=${opportunity?.id}`;
  };
  
  return (
    <div className="space-y-6">
      {/* ROI Analysis */}
      <Card className="border border-primary/20">
        <CardHeader className="pb-3">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg flex items-center">
              <TrendingUp className="h-5 w-5 mr-2 text-primary" />
              ROI Analysis
            </CardTitle>
            <Badge 
              className={getRoiScoreClass(opportunityAnalysis.roiScore)}
            >
              {opportunityAnalysis.roiScore}/100
            </Badge>
          </div>
          <CardDescription>
            Bang for buck assessment for this opportunity
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Potential Monthly Income</p>
              <p className="text-lg font-medium flex items-center">
                <CircleDollarSign className="h-4 w-4 mr-1 text-green-500" />
                ${opportunityAnalysis.potentialEarnings.toLocaleString()}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Initial Investment</p>
              <p className="text-lg font-medium flex items-center">
                <Briefcase className="h-4 w-4 mr-1 text-blue-500" />
                ${opportunityAnalysis.initialInvestment.toLocaleString()}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Time to First Revenue</p>
              <p className="text-lg font-medium flex items-center">
                <Clock className="h-4 w-4 mr-1 text-amber-500" />
                ~{opportunityAnalysis.timeToFirstRevenue} days
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Skill Gap Closure</p>
              <p className="text-lg font-medium flex items-center">
                <GraduationCap className="h-4 w-4 mr-1 text-purple-500" />
                ~{opportunityAnalysis.skillGapClosureTime} days
              </p>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button 
            className="w-full" 
            onClick={handleCreateActionPlan}
          >
            Create Action Plan
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </CardFooter>
      </Card>

      {/* Skill Gap Analysis */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg flex items-center">
              <Target className="h-5 w-5 mr-2 text-primary" />
              Skill Gap Analysis
            </CardTitle>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setShowDetailed(!showDetailed)}
            >
              {showDetailed ? "Show Summary" : "Show Detailed"}
            </Button>
          </div>
          <CardDescription>
            Skills needed for this opportunity
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {requiredSkills.map((skill, index) => (
              <div key={index} className="space-y-2">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium capitalize">{skill.name}</p>
                    <div className="flex items-center text-xs text-muted-foreground">
                      <span>Importance: </span>
                      <div className="flex ml-2">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Zap 
                            key={i} 
                            className={`h-3 w-3 ${i < skill.importance ? 'text-amber-500' : 'text-gray-300'}`} 
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <div className="flex items-center">
                          <Badge 
                            variant="outline" 
                            className={skill.requiredLevel <= skill.userLevel ? 'bg-green-100' : 'bg-red-100'}
                          >
                            {skill.userLevel}/{skill.requiredLevel}
                          </Badge>
                          
                          {skill.requiredLevel <= skill.userLevel ? (
                            <CheckCircle className="h-4 w-4 ml-2 text-green-500" />
                          ) : (
                            <AlertCircle className="h-4 w-4 ml-2 text-red-500" />
                          )}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Your level: {skill.userLevel}/5</p>
                        <p>Required level: {skill.requiredLevel}/5</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                
                <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${getSkillGapColor(skill.requiredLevel, skill.userLevel)}`}
                    style={{ width: `${(skill.userLevel / 5) * 100}%` }}
                  />
                </div>
                
                {showDetailed && skill.requiredLevel > skill.userLevel && (
                  <Alert className="mt-2 bg-muted/50">
                    <Lightbulb className="h-4 w-4" />
                    <AlertTitle>Skill Gap</AlertTitle>
                    <AlertDescription className="text-xs">
                      <div className="mt-1 mb-2">
                        <span>Estimated learning time: </span>
                        <span className="font-medium">{skill.learningTimeHours} hours</span>
                      </div>
                      
                      {skill.recommendedResources && (
                        <div>
                          <p className="font-medium mb-1">Recommended resources:</p>
                          <ul className="space-y-1">
                            {skill.recommendedResources.map((resource, idx) => (
                              <li key={idx} className="flex items-center">
                                {getResourceIcon(resource.type)}
                                <a 
                                  href={resource.url} 
                                  className="ml-2 text-primary hover:underline"
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                >
                                  {resource.title}
                                </a>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}