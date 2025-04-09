import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ChevronRight, ChevronLeft, CheckCircle, Award, Lightbulb, Sparkles, BookmarkPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { OpportunityType, RiskLevel } from "@/types";

// Define question types
type Question = {
  id: string;
  text: string;
  type: "multiple-choice" | "open-ended" | "skills-selector" | "experience-rating";
  options?: Array<{ id: string; text: string }>;
  skillCategory?: string;
};

// Skills mapping
const skillCategoriesMap: Record<string, string[]> = {
  technical: [
    "Web Development", "Mobile Development", "Graphic Design", "Video Editing",
    "Data Analysis", "Content Writing", "SEO", "Social Media Management",
    "Photography", "UI/UX Design", "3D Modeling", "Animation", 
    "Audio Production", "Translation", "Copywriting", "Illustration"
  ],
  professional: [
    "Project Management", "Marketing Strategy", "Business Analysis", 
    "Financial Planning", "HR Consulting", "Legal Research", "Teaching/Tutoring",
    "Coaching", "Public Speaking", "Event Planning", "Virtual Assistance",
    "Bookkeeping", "Customer Service", "Sales", "Negotiation", "Proofreading"
  ],
  personal: [
    "Organization", "Communication", "Empathy", "Problem Solving", 
    "Time Management", "Storytelling", "Research", "Networking",
    "Adaptability", "Leadership", "Attention to Detail", "Creativity"
  ],
  hobby: [
    "Cooking", "Fitness Training", "Interior Design", "Gardening", 
    "Music", "Crafting", "Fashion Styling", "Gaming", "Travel Planning",
    "Pet Training", "Home Maintenance", "Sports Coaching", "Writing"
  ]
};

// Market demand ratings (simulated for now, would come from backend)
const marketDemandRatings: Record<string, number> = {
  "Web Development": 9,
  "Mobile Development": 9,
  "Graphic Design": 8,
  "Video Editing": 8,
  "Data Analysis": 9,
  "Content Writing": 7,
  "SEO": 8,
  "Social Media Management": 8,
  "UI/UX Design": 9,
  "Project Management": 8,
  "Marketing Strategy": 8,
  "Teaching/Tutoring": 7,
  "Virtual Assistance": 7,
  "Coaching": 6,
  "Copywriting": 8,
  "Bookkeeping": 7,
  // Add more ratings as needed
};

// The questions for the assessment
const assessmentQuestions: Question[] = [
  {
    id: "career-background",
    text: "What is your professional background? Select all that apply.",
    type: "multiple-choice",
    options: [
      { id: "tech", text: "Technology & Software" },
      { id: "creative", text: "Creative & Design" },
      { id: "business", text: "Business & Finance" },
      { id: "education", text: "Education & Training" },
      { id: "healthcare", text: "Healthcare & Wellness" },
      { id: "trade", text: "Trades & Services" },
      { id: "other", text: "Other" }
    ]
  },
  {
    id: "skill-inventory-technical",
    text: "Which of these technical skills do you have experience with?",
    type: "skills-selector",
    skillCategory: "technical"
  },
  {
    id: "skill-inventory-professional",
    text: "Which of these professional skills are you confident in?",
    type: "skills-selector",
    skillCategory: "professional"
  },
  {
    id: "skill-inventory-personal",
    text: "Which of these personal attributes do you consider your strengths?",
    type: "skills-selector",
    skillCategory: "personal"
  },
  {
    id: "hobby-skills",
    text: "Do you have any hobbies or interests that could be monetized?",
    type: "skills-selector",
    skillCategory: "hobby"
  },
  {
    id: "hidden-skills",
    text: "What tasks do friends, family, or colleagues often ask for your help with?",
    type: "open-ended"
  },
  {
    id: "time-availability",
    text: "How much time can you dedicate to a side hustle per week?",
    type: "multiple-choice",
    options: [
      { id: "minimal", text: "Less than 5 hours" },
      { id: "low", text: "5-10 hours" },
      { id: "medium", text: "10-20 hours" },
      { id: "high", text: "20+ hours" }
    ]
  },
  {
    id: "work-preference",
    text: "How do you prefer to work?",
    type: "multiple-choice",
    options: [
      { id: "independent", text: "Independently on my own projects" },
      { id: "client", text: "Directly with clients" },
      { id: "platform", text: "Through platforms like Upwork or Fiverr" },
      { id: "product", text: "Creating products to sell" },
      { id: "flexible", text: "I'm flexible and open to any approach" }
    ]
  }
];

// Types for the assessment results
interface SkillAssessmentResult {
  topSkills: { skill: string; rating: number; category: string }[];
  marketableSkills: { skill: string; demand: number; category: string }[];
  recommendedPath: string;
  potentialServices: string[];
  nextSteps: string[];
}

export default function SkillAssessmentTool() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [results, setResults] = useState<SkillAssessmentResult | null>(null);
  
  // Mutation to save the recommendations as opportunities
  const saveOpportunityMutation = useMutation({
    mutationFn: async (opportunityData: any) => {
      const res = await apiRequest("POST", "/api/opportunities", { opportunityData });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/opportunities"] });
      toast({
        title: "Recommendations saved",
        description: "Your skill recommendations have been added to your opportunities.",
        variant: "default",
      });
    },
    onError: () => {
      toast({
        title: "Failed to save",
        description: "There was a problem saving your recommendations. Please try again.",
        variant: "destructive",
      });
    },
  });

  const currentQuestion = assessmentQuestions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / assessmentQuestions.length) * 100;

  const handleMultipleChoiceAnswer = (optionId: string, isChecked: boolean) => {
    setAnswers(prev => {
      const currentAnswers = prev[currentQuestion.id] || [];
      if (isChecked) {
        return { ...prev, [currentQuestion.id]: [...currentAnswers, optionId] };
      } else {
        return { 
          ...prev, 
          [currentQuestion.id]: currentAnswers.filter((id: string) => id !== optionId) 
        };
      }
    });
  };

  const handleOpenEndedAnswer = (text: string) => {
    setAnswers(prev => ({ ...prev, [currentQuestion.id]: text }));
  };

  const handleSkillSelection = (skill: string, isChecked: boolean) => {
    if (isChecked) {
      setSelectedSkills(prev => [...prev, skill]);
      setAnswers(prev => {
        const currentSkills = prev[currentQuestion.id] || [];
        return { ...prev, [currentQuestion.id]: [...currentSkills, skill] };
      });
    } else {
      setSelectedSkills(prev => prev.filter(s => s !== skill));
      setAnswers(prev => {
        const currentSkills = prev[currentQuestion.id] || [];
        return { 
          ...prev, 
          [currentQuestion.id]: currentSkills.filter((s: string) => s !== skill) 
        };
      });
    }
  };

  const goToNextQuestion = () => {
    if (currentQuestionIndex < assessmentQuestions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      completeAssessment();
    }
  };

  const goToPreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const completeAssessment = () => {
    // Collect all selected skills across categories
    const allSelectedSkills: string[] = [];
    
    Object.keys(answers).forEach(questionId => {
      const question = assessmentQuestions.find(q => q.id === questionId);
      if (question?.type === "skills-selector" && Array.isArray(answers[questionId])) {
        allSelectedSkills.push(...answers[questionId]);
      }
    });

    // Generate top skills based on marketability and selection
    const skillsWithRatings = allSelectedSkills.map(skill => {
      const category = Object.keys(skillCategoriesMap).find(cat => 
        skillCategoriesMap[cat].includes(skill)
      ) || "other";
      
      return {
        skill,
        rating: marketDemandRatings[skill] || 5, // Default to 5 if no rating
        category
      };
    });

    // Sort by market demand rating
    const topSkills = [...skillsWithRatings].sort((a, b) => b.rating - a.rating).slice(0, 5);
    
    // Generate marketable skills (ones with high demand)
    const marketableSkills = skillsWithRatings
      .filter(skill => skill.rating >= 7)
      .sort((a, b) => b.rating - a.rating)
      .map(skill => ({
        skill: skill.skill,
        demand: skill.rating,
        category: skill.category
      }));
    
    // Determine recommended path based on answers
    let recommendedPath = "Freelancing";
    const workPref = answers["work-preference"] || [];
    const timeAvail = answers["time-availability"] || [];
    
    if (workPref.includes("independent") && timeAvail.includes("medium")) {
      recommendedPath = "Digital Product Creation";
    } else if (workPref.includes("platform") && marketableSkills.some(s => s.category === "technical")) {
      recommendedPath = "Technical Freelancing";
    } else if (workPref.includes("client") && marketableSkills.some(s => s.category === "creative")) {
      recommendedPath = "Creative Services";
    }
    
    // Generate potential services based on top skills
    const potentialServices = topSkills.map(skill => {
      switch (skill.skill) {
        case "Web Development":
          return "Website Development and Maintenance";
        case "Content Writing":
          return "Blog Writing and Content Creation";
        case "Social Media Management":
          return "Social Media Strategy and Management";
        case "Graphic Design":
          return "Brand Identity and Visual Design";
        case "Project Management":
          return "Project Coordination and Management";
        case "Teaching/Tutoring":
          return "Online Tutoring and Course Creation";
        default:
          return `${skill.skill} Services`;
      }
    });
    
    // Generate next steps
    const nextSteps = [
      "Complete your skill profile with portfolio examples",
      "Set your pricing using our Pricing Calculator",
      "Generate a custom action plan for your first monetization project",
      "Join our community to connect with peers in your skill area"
    ];
    
    setResults({
      topSkills,
      marketableSkills,
      recommendedPath,
      potentialServices,
      nextSteps
    });
    
    setIsComplete(true);
  };

  const renderQuestionContent = () => {
    switch (currentQuestion.type) {
      case "multiple-choice":
        return (
          <div className="space-y-3">
            {currentQuestion.options?.map(option => (
              <div key={option.id} className="flex items-center space-x-2">
                <Checkbox 
                  id={option.id} 
                  checked={(answers[currentQuestion.id] || []).includes(option.id)}
                  onCheckedChange={(checked) => 
                    handleMultipleChoiceAnswer(option.id, checked === true)
                  }
                />
                <label 
                  htmlFor={option.id}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {option.text}
                </label>
              </div>
            ))}
          </div>
        );
      
      case "open-ended":
        return (
          <div className="space-y-2">
            <Textarea
              placeholder="Type your answer here..."
              value={answers[currentQuestion.id] || ""}
              onChange={(e) => handleOpenEndedAnswer(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
        );
      
      case "skills-selector":
        const skills = skillCategoriesMap[currentQuestion.skillCategory || ""] || [];
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Select all that apply:</p>
            <div className="grid grid-cols-2 gap-2">
              {skills.map(skill => (
                <div key={skill} className="flex items-center space-x-2">
                  <Checkbox 
                    id={`skill-${skill}`}
                    checked={(answers[currentQuestion.id] || []).includes(skill)}
                    onCheckedChange={(checked) => 
                      handleSkillSelection(skill, checked === true)
                    }
                  />
                  <label 
                    htmlFor={`skill-${skill}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {skill}
                  </label>
                </div>
              ))}
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  const renderResults = () => {
    if (!results) return null;
    
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-3 flex items-center">
            <Award className="h-5 w-5 mr-2 text-primary" />
            Your Top Skills
          </h3>
          <div className="space-y-3">
            {results.topSkills.map((skill, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center">
                  <Badge variant="outline" className="mr-2">
                    {index + 1}
                  </Badge>
                  <span>{skill.skill}</span>
                </div>
                <div className="flex items-center">
                  <div className="mr-2 text-sm">Market Demand:</div>
                  <Progress value={skill.rating * 10} className="w-20 h-2" />
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <Separator />
        
        <div>
          <h3 className="text-lg font-semibold mb-3 flex items-center">
            <Sparkles className="h-5 w-5 mr-2 text-primary" />
            Recommended Path
          </h3>
          <Card className="bg-primary/5 border border-primary/20">
            <CardContent className="pt-6">
              <h4 className="text-xl font-bold text-primary">{results.recommendedPath}</h4>
              <p className="text-sm text-muted-foreground mt-2">
                Based on your skills, preferences, and available time, we recommend focusing on {results.recommendedPath.toLowerCase()}.
              </p>
            </CardContent>
          </Card>
        </div>
        
        <div>
          <h3 className="text-lg font-semibold mb-3 flex items-center">
            <CheckCircle className="h-5 w-5 mr-2 text-primary" />
            Potential Services You Can Offer
          </h3>
          <ul className="space-y-2">
            {results.potentialServices.map((service, index) => (
              <li key={index} className="flex items-start">
                <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center text-primary mr-2 shrink-0 mt-0.5">
                  {index + 1}
                </div>
                <span>{service}</span>
              </li>
            ))}
          </ul>
        </div>
        
        <Separator />
        
        <div>
          <h3 className="text-lg font-semibold mb-3 flex items-center">
            <Lightbulb className="h-5 w-5 mr-2 text-primary" />
            Next Steps
          </h3>
          <ul className="space-y-3">
            {results.nextSteps.map((step, index) => (
              <li key={index} className="flex items-start">
                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-primary mr-2 shrink-0 mt-0.5 text-sm">
                  {index + 1}
                </div>
                <span>{step}</span>
              </li>
            ))}
          </ul>
        </div>
        
        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={() => setIsComplete(false)}>
            Retake Assessment
          </Button>
          
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              className="flex items-center"
              onClick={() => {
                if (!user) {
                  toast({
                    title: "Login required",
                    description: "Please log in to save your recommendations.",
                    variant: "destructive",
                  });
                  return;
                }
                
                // Transform results to opportunities
                const opportunities = results.potentialServices.map((service, index) => {
                  // Get related skill from top skills
                  const relatedSkill = results.topSkills[index] || results.topSkills[0];
                  
                  // Determine opportunity type based on recommended path
                  let type = OpportunityType.FREELANCE;
                  if (results.recommendedPath.includes("Digital Product")) {
                    type = OpportunityType.DIGITAL_PRODUCT;
                  } else if (results.recommendedPath.includes("Creative")) {
                    type = OpportunityType.CONTENT;
                  } else if (results.recommendedPath.includes("Technical")) {
                    type = OpportunityType.SERVICE;
                  }
                  
                  return {
                    title: service,
                    type,
                    description: `Monetize your ${relatedSkill.skill} skills with this opportunity.`,
                    icon: "",
                    incomePotential: relatedSkill.rating >= 8 ? "$$$" : relatedSkill.rating >= 6 ? "$$" : "$",
                    startupCost: "$",
                    riskLevel: RiskLevel.LOW,
                    stepsToStart: [
                      "Research the market and competitors",
                      "Define your unique selling proposition",
                      "Create a basic portfolio or samples",
                      "Set up your pricing structure",
                      "Find your first clients"
                    ],
                    resources: [
                      {
                        title: "Getting Started Guide",
                        url: "#",
                        source: "SideHustle"
                      }
                    ]
                  };
                });
                
                // Create and save opportunity data
                const opportunityData = {
                  opportunities,
                  userProfile: {
                    skills: results.topSkills.map(s => s.skill),
                    timeAvailability: answers["time-availability"] ? answers["time-availability"].join(", ") : "medium",
                    incomeGoals: 1000, // Default
                    riskTolerance: "low",
                    preference: answers["work-preference"] ? answers["work-preference"].join(", ") : "client"
                  }
                };
                
                saveOpportunityMutation.mutate(opportunityData);
              }}
            >
              <BookmarkPlus className="mr-2 h-4 w-4" />
              Save Recommendations
            </Button>
            
            <Button onClick={() => window.location.href = "/action-plan"}>
              Create Action Plan
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Skill Assessment Tool</CardTitle>
        <CardDescription>
          Discover your most marketable skills and monetization opportunities
        </CardDescription>
        {!isComplete && (
          <Progress value={progress} className="mt-2" />
        )}
      </CardHeader>
      
      <CardContent>
        {!isComplete ? (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold">
              {currentQuestion.text}
            </h3>
            {renderQuestionContent()}
          </div>
        ) : (
          renderResults()
        )}
      </CardContent>
      
      {!isComplete && (
        <CardFooter className="flex justify-between">
          <Button 
            variant="outline" 
            onClick={goToPreviousQuestion}
            disabled={currentQuestionIndex === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          
          <Button onClick={goToNextQuestion}>
            {currentQuestionIndex < assessmentQuestions.length - 1 ? (
              <>
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </>
            ) : (
              "Complete Assessment"
            )}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}