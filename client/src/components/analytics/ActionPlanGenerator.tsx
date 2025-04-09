import React, { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { 
  CheckCircle2, 
  ArrowRight, 
  ChevronRight, 
  Clock, 
  Calendar, 
  Target, 
  BookOpen, 
  CreditCard, 
  Users, 
  BarChart3, 
  Megaphone, 
  Presentation, 
  BadgeCheck 
} from "lucide-react";

// Different tabs for the form
type FormStep = "skills" | "goals" | "resources" | "review";

// Form data structure
interface ActionPlanFormData {
  // Skills section
  skills: {
    primarySkill: string;
    secondarySkills: string[];
    confidenceRating: number;
    experience: string;
    timeAvailablePerWeek: number;
  };
  
  // Goals section
  goals: {
    targetMonthlyIncome: number;
    timeline: number; // in months
    riskTolerance: number;
    workStyle: "client" | "product" | "passive" | "mixed";
  };
  
  // Resources section
  resources: {
    existingTools: string;
    initialBudget: number;
    existingAudience: string;
    strengths: string;
    weaknesses: string;
  };
}

// Action plan structure
interface ActionPlan {
  userId: number;
  title: string;
  createdAt: string;
  
  // Plan phases
  phases: {
    title: string;
    duration: string;
    tasks: {
      id: string;
      title: string;
      description: string;
      priority: "high" | "medium" | "low";
      durationDays: number;
      status: "pending" | "in-progress" | "completed";
      resourceLinks?: { title: string; url: string }[];
      dependsOn?: string[];
    }[];
  }[];
  
  // User inputs summary
  userInputs: ActionPlanFormData;
}

interface ActionPlanGeneratorProps {
  opportunityId?: number;
}

export default function ActionPlanGenerator({ opportunityId }: ActionPlanGeneratorProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState<FormStep>("skills");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState<ActionPlan | null>(null);
  
  // Initialize form data
  const [formData, setFormData] = useState<ActionPlanFormData>({
    skills: {
      primarySkill: "",
      secondarySkills: [],
      confidenceRating: 3,
      experience: "",
      timeAvailablePerWeek: 10,
    },
    goals: {
      targetMonthlyIncome: 1000,
      timeline: 3,
      riskTolerance: 3,
      workStyle: "mixed",
    },
    resources: {
      existingTools: "",
      initialBudget: 100,
      existingAudience: "",
      strengths: "",
      weaknesses: "",
    }
  });
  
  // Save user's action plan
  const saveActionPlanMutation = useMutation({
    mutationFn: async (actionPlan: ActionPlan) => {
      const res = await apiRequest("POST", "/api/analytics/action-plans", actionPlan);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/action-plans"] });
      toast({
        title: "Action Plan Saved",
        description: "Your custom action plan has been saved successfully.",
        variant: "default",
      });
    },
    onError: (error) => {
      toast({
        title: "Error Saving Plan",
        description: error instanceof Error ? error.message : "Failed to save your action plan.",
        variant: "destructive",
      });
    }
  });
  
  // Update form data
  const updateFormData = (section: keyof ActionPlanFormData, field: string, value: any) => {
    setFormData({
      ...formData,
      [section]: {
        ...formData[section],
        [field]: value
      }
    });
  };
  
  // Handle next step
  const handleNext = () => {
    if (currentStep === "skills") setCurrentStep("goals");
    else if (currentStep === "goals") setCurrentStep("resources");
    else if (currentStep === "resources") setCurrentStep("review");
  };
  
  // Handle previous step
  const handlePrevious = () => {
    if (currentStep === "goals") setCurrentStep("skills");
    else if (currentStep === "resources") setCurrentStep("goals");
    else if (currentStep === "review") setCurrentStep("resources");
  };
  
  // Generate action plan
  const generateActionPlan = () => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please log in to generate an action plan.",
        variant: "destructive",
      });
      return;
    }
    
    setIsGenerating(true);
    
    // This would typically be an API call to generate the plan
    // For now, we'll create a sample plan based on the user's input
    setTimeout(() => {
      const plan: ActionPlan = {
        userId: user.id,
        title: `Action Plan for Monetizing ${formData.skills.primarySkill}`,
        createdAt: new Date().toISOString(),
        userInputs: formData,
        phases: [
          {
            title: "Phase 1: Foundation",
            duration: "2 weeks",
            tasks: [
              {
                id: "task-1-1",
                title: "Validate Your Skill in the Market",
                description: `Research at least 5 people/businesses currently monetizing ${formData.skills.primarySkill} successfully. Document their offerings, pricing, and positioning.`,
                priority: "high",
                durationDays: 3,
                status: "pending",
                resourceLinks: [
                  { title: "Market Research Template", url: "#" },
                  { title: "Competitor Analysis Framework", url: "#" }
                ]
              },
              {
                id: "task-1-2",
                title: "Define Your Unique Value Proposition",
                description: "Based on your research, identify gaps in the market and ways your specific experience can provide unique value.",
                priority: "high",
                durationDays: 2,
                status: "pending",
                dependsOn: ["task-1-1"]
              },
              {
                id: "task-1-3",
                title: "Create a Portfolio Piece",
                description: `Develop one high-quality example of your ${formData.skills.primarySkill} work that showcases your abilities.`,
                priority: "medium",
                durationDays: 5,
                status: "pending"
              },
              {
                id: "task-1-4",
                title: "Set Up Professional Profiles",
                description: "Create or update your LinkedIn profile and any relevant platform profiles to highlight your services.",
                priority: "medium",
                durationDays: 2,
                status: "pending"
              }
            ]
          },
          {
            title: "Phase 2: Launch Preparation",
            duration: "3 weeks",
            tasks: [
              {
                id: "task-2-1",
                title: "Develop Service/Product Packages",
                description: "Create 2-3 different service tiers or product options with clear deliverables and pricing.",
                priority: "high",
                durationDays: 4,
                status: "pending",
                dependsOn: ["task-1-2"]
              },
              {
                id: "task-2-2",
                title: "Create Client Onboarding Materials",
                description: "Develop questionnaires, contracts, and workflow documents to efficiently onboard new clients.",
                priority: "medium",
                durationDays: 3,
                status: "pending"
              },
              {
                id: "task-2-3",
                title: "Set Up Payment System",
                description: "Create accounts on payment platforms (Stripe, PayPal, etc.) and set up invoicing templates.",
                priority: "high",
                durationDays: 2,
                status: "pending"
              },
              {
                id: "task-2-4",
                title: "Develop Marketing Materials",
                description: "Create an elevator pitch, social media content templates, and outreach email templates.",
                priority: "medium",
                durationDays: 5,
                status: "pending",
                resourceLinks: [
                  { title: "Email Outreach Templates", url: "#" },
                  { title: "Social Media Content Calendar", url: "#" }
                ]
              }
            ]
          },
          {
            title: "Phase 3: First Clients/Sales",
            duration: "4 weeks",
            tasks: [
              {
                id: "task-3-1",
                title: "Create Lead Generation Plan",
                description: "Identify and list 20-30 potential clients/customers who would benefit from your services/products.",
                priority: "high",
                durationDays: 3,
                status: "pending",
                dependsOn: ["task-2-1", "task-2-4"]
              },
              {
                id: "task-3-2",
                title: "Launch Outreach Campaign",
                description: "Contact at least 5 potential clients per day using your outreach templates.",
                priority: "high",
                durationDays: 14,
                status: "pending",
                dependsOn: ["task-3-1"]
              },
              {
                id: "task-3-3",
                title: "Set Up Client Feedback System",
                description: "Create a process to collect and incorporate client feedback to improve your offerings.",
                priority: "medium",
                durationDays: 2,
                status: "pending"
              },
              {
                id: "task-3-4",
                title: "Secure First Client/Sale",
                description: "Close your first deal and deliver exceptional service to generate referrals.",
                priority: "high",
                durationDays: 7,
                status: "pending",
                dependsOn: ["task-3-2"]
              }
            ]
          },
          {
            title: "Phase 4: Optimization & Growth",
            duration: "Ongoing",
            tasks: [
              {
                id: "task-4-1",
                title: "Set Up Analytics Tracking",
                description: "Implement systems to track key metrics: leads, conversion rate, client satisfaction, and income.",
                priority: "medium",
                durationDays: 3,
                status: "pending"
              },
              {
                id: "task-4-2",
                title: "Refine Service Offerings",
                description: "Based on client feedback and market response, adjust your service/product packages.",
                priority: "medium",
                durationDays: 4,
                status: "pending",
                dependsOn: ["task-3-4"]
              },
              {
                id: "task-4-3",
                title: "Develop Referral System",
                description: "Create incentives for existing clients to refer new business to you.",
                priority: "medium",
                durationDays: 2,
                status: "pending",
                dependsOn: ["task-3-4"]
              },
              {
                id: "task-4-4",
                title: "Scale Your Operation",
                description: "Identify processes that can be automated or delegated to increase your capacity.",
                priority: "low",
                durationDays: 7,
                status: "pending",
                dependsOn: ["task-4-2"]
              }
            ]
          }
        ]
      };
      
      setGeneratedPlan(plan);
      setIsGenerating(false);
    }, 2000); // Simulate API delay
  };
  
  // Save the generated plan
  const saveActionPlan = async () => {
    if (generatedPlan) {
      try {
        // Associate the plan with an opportunity if provided
        const planToSave = {
          ...generatedPlan,
          opportunityId: opportunityId || undefined
        };
        
        // Remove any circular references or overly complex objects
        const sanitizedPlan = JSON.parse(JSON.stringify(planToSave));
        saveActionPlanMutation.mutate(sanitizedPlan);
      } catch (error) {
        console.error("Error preparing action plan for save:", error);
        toast({
          title: "Error Preparing Plan",
          description: "There was an issue preparing your action plan for saving. Please try again.",
          variant: "destructive",
        });
      }
    }
  };
  
  // Calculate form progress
  const calculateProgress = () => {
    if (currentStep === "skills") return 25;
    if (currentStep === "goals") return 50;
    if (currentStep === "resources") return 75;
    return 100;
  };
  
  // Render skills assessment form
  const renderSkillsForm = () => {
    return (
      <div className="space-y-6">
        <div className="space-y-3">
          <Label htmlFor="primarySkill">What is your primary skill?</Label>
          <Input
            id="primarySkill"
            placeholder="e.g., Web Development, Graphic Design, Content Writing"
            value={formData.skills.primarySkill}
            onChange={(e) => updateFormData("skills", "primarySkill", e.target.value)}
          />
        </div>
        
        <div className="space-y-3">
          <Label htmlFor="secondarySkills">Any supporting skills? (comma separated)</Label>
          <Input
            id="secondarySkills"
            placeholder="e.g., SEO, Social Media Management, Photography"
            value={formData.skills.secondarySkills.join(", ")}
            onChange={(e) => updateFormData("skills", "secondarySkills", e.target.value.split(", "))}
          />
        </div>
        
        <div className="space-y-3">
          <div className="flex justify-between">
            <Label htmlFor="confidenceRating">How confident are you in this skill?</Label>
            <span className="text-sm font-medium">{formData.skills.confidenceRating}/5</span>
          </div>
          <Slider
            id="confidenceRating"
            min={1}
            max={5}
            step={1}
            value={[formData.skills.confidenceRating]}
            onValueChange={(value) => updateFormData("skills", "confidenceRating", value[0])}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Beginner</span>
            <span>Intermediate</span>
            <span>Expert</span>
          </div>
        </div>
        
        <div className="space-y-3">
          <Label htmlFor="experience">Previous experience monetizing this skill</Label>
          <Textarea
            id="experience"
            placeholder="Describe any previous experience you have monetizing this skill..."
            value={formData.skills.experience}
            onChange={(e) => updateFormData("skills", "experience", e.target.value)}
          />
        </div>
        
        <div className="space-y-3">
          <div className="flex justify-between">
            <Label htmlFor="timeAvailable">Hours available per week</Label>
            <span className="text-sm font-medium">{formData.skills.timeAvailablePerWeek} hours</span>
          </div>
          <Slider
            id="timeAvailable"
            min={1}
            max={40}
            step={1}
            value={[formData.skills.timeAvailablePerWeek]}
            onValueChange={(value) => updateFormData("skills", "timeAvailablePerWeek", value[0])}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>5h</span>
            <span>20h</span>
            <span>40h</span>
          </div>
        </div>
      </div>
    );
  };
  
  // Render goals setting form
  const renderGoalsForm = () => {
    return (
      <div className="space-y-6">
        <div className="space-y-3">
          <Label htmlFor="targetIncome">Target monthly income ($)</Label>
          <Input
            id="targetIncome"
            type="number"
            placeholder="e.g., 1000"
            value={formData.goals.targetMonthlyIncome}
            onChange={(e) => updateFormData("goals", "targetMonthlyIncome", parseInt(e.target.value) || 0)}
          />
        </div>
        
        <div className="space-y-3">
          <Label htmlFor="timeline">Timeline to achieve goal (months)</Label>
          <Input
            id="timeline"
            type="number"
            placeholder="e.g., 3"
            value={formData.goals.timeline}
            onChange={(e) => updateFormData("goals", "timeline", parseInt(e.target.value) || 1)}
          />
        </div>
        
        <div className="space-y-3">
          <div className="flex justify-between">
            <Label htmlFor="riskTolerance">Risk tolerance</Label>
            <span className="text-sm font-medium">{formData.goals.riskTolerance}/5</span>
          </div>
          <Slider
            id="riskTolerance"
            min={1}
            max={5}
            step={1}
            value={[formData.goals.riskTolerance]}
            onValueChange={(value) => updateFormData("goals", "riskTolerance", value[0])}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Risk-averse</span>
            <span>Balanced</span>
            <span>Risk-tolerant</span>
          </div>
        </div>
        
        <div className="space-y-3">
          <Label htmlFor="workStyle">Preferred work style</Label>
          <Select
            value={formData.goals.workStyle}
            onValueChange={(value: "client" | "product" | "passive" | "mixed") => updateFormData("goals", "workStyle", value)}
          >
            <SelectTrigger id="workStyle">
              <SelectValue placeholder="Select work style" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="client">Client Work (services, consulting)</SelectItem>
              <SelectItem value="product">Digital Products (courses, templates)</SelectItem>
              <SelectItem value="passive">Passive Income Streams</SelectItem>
              <SelectItem value="mixed">Mixed Approach</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    );
  };
  
  // Render resources assessment form
  const renderResourcesForm = () => {
    return (
      <div className="space-y-6">
        <div className="space-y-3">
          <Label htmlFor="existingTools">Tools and software you already have</Label>
          <Textarea
            id="existingTools"
            placeholder="List tools, software, equipment you already have access to..."
            value={formData.resources.existingTools}
            onChange={(e) => updateFormData("resources", "existingTools", e.target.value)}
          />
        </div>
        
        <div className="space-y-3">
          <Label htmlFor="initialBudget">Initial investment budget ($)</Label>
          <Input
            id="initialBudget"
            type="number"
            placeholder="e.g., 100"
            value={formData.resources.initialBudget}
            onChange={(e) => updateFormData("resources", "initialBudget", parseInt(e.target.value) || 0)}
          />
        </div>
        
        <div className="space-y-3">
          <Label htmlFor="existingAudience">Existing audience or network</Label>
          <Textarea
            id="existingAudience"
            placeholder="Describe your existing professional network, audience, or social media following..."
            value={formData.resources.existingAudience}
            onChange={(e) => updateFormData("resources", "existingAudience", e.target.value)}
          />
        </div>
        
        <div className="space-y-3">
          <Label htmlFor="strengths">Your key strengths (personal or professional)</Label>
          <Textarea
            id="strengths"
            placeholder="What are your key strengths that could help you succeed?"
            value={formData.resources.strengths}
            onChange={(e) => updateFormData("resources", "strengths", e.target.value)}
          />
        </div>
        
        <div className="space-y-3">
          <Label htmlFor="weaknesses">Areas you might need support with</Label>
          <Textarea
            id="weaknesses"
            placeholder="What areas might be challenging for you?"
            value={formData.resources.weaknesses}
            onChange={(e) => updateFormData("resources", "weaknesses", e.target.value)}
          />
        </div>
      </div>
    );
  };
  
  // Render form review
  const renderReviewForm = () => {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium">Skills Assessment</h3>
          <div className="mt-2 space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Primary Skill:</span>
              <span className="font-medium">{formData.skills.primarySkill}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Secondary Skills:</span>
              <span className="font-medium">{formData.skills.secondarySkills.join(", ") || "None"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Skill Confidence:</span>
              <span className="font-medium">{formData.skills.confidenceRating}/5</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Time Available:</span>
              <span className="font-medium">{formData.skills.timeAvailablePerWeek} hours/week</span>
            </div>
          </div>
        </div>
        
        <Separator />
        
        <div>
          <h3 className="text-lg font-medium">Goals</h3>
          <div className="mt-2 space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Target Monthly Income:</span>
              <span className="font-medium">${formData.goals.targetMonthlyIncome}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Timeline:</span>
              <span className="font-medium">{formData.goals.timeline} months</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Risk Tolerance:</span>
              <span className="font-medium">{formData.goals.riskTolerance}/5</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Preferred Work Style:</span>
              <span className="font-medium">
                {formData.goals.workStyle === "client" && "Client Work"}
                {formData.goals.workStyle === "product" && "Digital Products"}
                {formData.goals.workStyle === "passive" && "Passive Income"}
                {formData.goals.workStyle === "mixed" && "Mixed Approach"}
              </span>
            </div>
          </div>
        </div>
        
        <Separator />
        
        <div>
          <h3 className="text-lg font-medium">Resources</h3>
          <div className="mt-2 space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Initial Budget:</span>
              <span className="font-medium">${formData.resources.initialBudget}</span>
            </div>
          </div>
        </div>
        
        <div className="mt-6">
          <Button 
            className="w-full"
            onClick={generateActionPlan}
            disabled={isGenerating}
          >
            {isGenerating ? "Generating Your Plan..." : "Generate Custom Action Plan"}
          </Button>
        </div>
      </div>
    );
  };
  
  // Render the generated action plan
  const renderActionPlan = () => {
    if (!generatedPlan) return null;
    
    return (
      <div className="space-y-8">
        <div className="bg-primary/5 rounded-lg p-4">
          <h2 className="text-xl font-semibold">{generatedPlan.title}</h2>
          <p className="text-muted-foreground mt-1">
            Personalized plan based on your {formData.skills.primarySkill} skills
          </p>
        </div>
        
        <Tabs defaultValue="phase-1" className="w-full">
          <TabsList className="grid grid-cols-4">
            <TabsTrigger value="phase-1">Phase 1</TabsTrigger>
            <TabsTrigger value="phase-2">Phase 2</TabsTrigger>
            <TabsTrigger value="phase-3">Phase 3</TabsTrigger>
            <TabsTrigger value="phase-4">Phase 4</TabsTrigger>
          </TabsList>
          
          {generatedPlan.phases.map((phase, index) => (
            <TabsContent key={`phase-${index + 1}`} value={`phase-${index + 1}`} className="space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold">{phase.title}</h3>
                  <p className="text-muted-foreground flex items-center mt-1">
                    <Clock className="h-4 w-4 mr-1" />
                    Duration: {phase.duration}
                  </p>
                </div>
              </div>
              
              <div className="space-y-4 mt-4">
                {phase.tasks.map((task) => (
                  <Card key={task.id} className="overflow-hidden">
                    <div className={`h-1 ${task.priority === "high" ? "bg-red-500" : task.priority === "medium" ? "bg-amber-500" : "bg-green-500"}`} />
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between">
                        <h4 className="font-medium">{task.title}</h4>
                        <Badge variant={task.priority === "high" ? "destructive" : task.priority === "medium" ? "default" : "outline"}>
                          {task.priority} priority
                        </Badge>
                      </div>
                      <p className="text-muted-foreground mt-2 text-sm">
                        {task.description}
                      </p>
                      
                      <div className="flex items-center mt-4 text-xs">
                        <div className="flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          <span>{task.durationDays} days</span>
                        </div>
                        
                        {task.dependsOn && task.dependsOn.length > 0 && (
                          <div className="flex items-center ml-4">
                            <ArrowRight className="h-3 w-3 mr-1" />
                            <span>Requires previous tasks</span>
                          </div>
                        )}
                      </div>
                      
                      {task.resourceLinks && task.resourceLinks.length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs font-medium mb-1">Helpful Resources:</p>
                          <div className="flex flex-wrap gap-2">
                            {task.resourceLinks.map((link, i) => (
                              <a
                                key={i}
                                href={link.url}
                                className="inline-flex items-center text-xs text-primary hover:underline"
                              >
                                <BookOpen className="h-3 w-3 mr-1" />
                                {link.title}
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>
        
        <div className="pt-4 flex justify-between">
          <Button variant="outline" onClick={() => setGeneratedPlan(null)}>
            Edit Plan Inputs
          </Button>
          
          <Button onClick={saveActionPlan} disabled={saveActionPlanMutation.isPending}>
            {saveActionPlanMutation.isPending ? "Saving..." : "Save This Plan"}
          </Button>
        </div>
      </div>
    );
  };
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Custom Action Plan Generator</CardTitle>
        <CardDescription>
          Create a personalized roadmap to monetize your skills based on your unique situation
        </CardDescription>
        {!generatedPlan && (
          <Progress value={calculateProgress()} className="mt-2" />
        )}
      </CardHeader>
      
      <CardContent>
        {generatedPlan ? (
          renderActionPlan()
        ) : (
          <div className="space-y-6">
            {currentStep === "skills" && renderSkillsForm()}
            {currentStep === "goals" && renderGoalsForm()}
            {currentStep === "resources" && renderResourcesForm()}
            {currentStep === "review" && renderReviewForm()}
          </div>
        )}
      </CardContent>
      
      {!generatedPlan && currentStep !== "review" && (
        <CardFooter className="flex justify-between">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === "skills"}
          >
            Previous
          </Button>
          
          <Button onClick={handleNext}>
            Next <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}