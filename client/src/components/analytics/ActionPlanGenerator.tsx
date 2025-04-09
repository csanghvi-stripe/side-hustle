import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Clipboard,
  ClipboardCheck,
  Goal,
  Calendar,
  Clock,
  Award,
  CheckCircle,
  CircleCheck,
  Zap,
  BadgeCheck,
  Lightbulb,
  Milestone,
  Flag
} from "lucide-react";

// Types for action plan
interface ActionPlanMilestone {
  title: string;
  description: string;
  dueDate: string;
  completed: boolean;
}

interface ActionPlan {
  skill: string;
  goal: string;
  targetIncome: number;
  timeframe: string;
  timeCommitment: string;
  roadblocks: string[];
  milestones: ActionPlanMilestone[];
  nextSteps: string[];
  resources: string[];
  accountabilityMethod: string;
}

// Path templates, each with predefined milestones and resources
const pathTemplates = {
  "freelancing": {
    milestones: [
      { title: "Define your niche and services", description: "Research and determine the specific services you'll offer based on your skills and market demand." },
      { title: "Set up professional profiles", description: "Create profiles on relevant platforms (Upwork, Fiverr, LinkedIn) with portfolio examples." },
      { title: "Create service packages", description: "Define 2-3 service tiers with clear deliverables and pricing." },
      { title: "Land your first client", description: "Secure your first paying client through pitching, networking, or platform application." },
      { title: "Get testimonials", description: "Complete work and collect client feedback for social proof." },
    ],
    resources: [
      "\"The Six-Figure Freelancer\" - Practical guide to high-earning freelancing",
      "Upwork's guide to creating an outstanding profile",
      "Client Proposal Template (available in Resources section)",
      "Freelance Contract Checklist (available in Resources section)"
    ]
  },
  "digital-product": {
    milestones: [
      { title: "Validate your product idea", description: "Conduct research and gather feedback to confirm market demand for your concept." },
      { title: "Create your minimum viable product", description: "Develop the simplest version of your product that delivers core value." },
      { title: "Set up digital infrastructure", description: "Create landing page, payment processing, and delivery system." },
      { title: "Launch beta version", description: "Release to a small group of users for feedback and testimonials." },
      { title: "Full product launch", description: "Release your product with marketing campaign and gather first sales." },
    ],
    resources: [
      "\"Building a StoryBrand\" - Guide to clarifying your product message",
      "Digital Product Pricing Strategy Guide (in Resources section)",
      "Landing Page Conversion Checklist",
      "Email Marketing Quick Start Guide"
    ]
  },
  "service-business": {
    milestones: [
      { title: "Define your service model", description: "Determine service offerings, client processes, and delivery methods." },
      { title: "Create brand identity", description: "Develop your business name, visual identity, and positioning." },
      { title: "Build basic online presence", description: "Create a website and social profiles to establish credibility." },
      { title: "Develop client acquisition system", description: "Create a repeatable process for finding and converting clients." },
      { title: "Optimize and scale operations", description: "Refine your process and prepare for growth." },
    ],
    resources: [
      "\"The E-Myth Revisited\" - Guide to building systems in a service business",
      "Client Onboarding Template (available in Resources section)",
      "Service Business Financial Projection Tool",
      "Customer Journey Mapping Guide"
    ]
  },
  "content-creation": {
    milestones: [
      { title: "Define your content niche", description: "Identify your specific topic area and target audience." },
      { title: "Build your platform", description: "Set up accounts on relevant platforms (YouTube, blog, Instagram, etc.)." },
      { title: "Create consistent content", description: "Develop a production schedule and create first batch of content." },
      { title: "Grow your audience", description: "Implement strategies to increase followers and engagement." },
      { title: "Implement monetization", description: "Add revenue streams like sponsorships, ads, or affiliate marketing." },
    ],
    resources: [
      "\"Content Inc.\" - Guide to audience building and content monetization",
      "Content Calendar Template (available in Resources section)",
      "Platform-Specific Best Practices Guides",
      "Monetization Strategy Comparison Chart"
    ]
  }
};

// Common roadblocks with advice
const commonRoadblocks = [
  { 
    id: "time", 
    label: "Limited time availability", 
    advice: "Break tasks into 25-minute focused sessions. Even short, consistent effort builds momentum over time."
  },
  { 
    id: "confidence", 
    label: "Lack of confidence/imposter syndrome", 
    advice: "Start with small, achievable goals to build confidence. Document all positive feedback to review when doubts arise."
  },
  { 
    id: "technical", 
    label: "Technical skill gaps", 
    advice: "Identify specific skills needed and find targeted tutorials. Focus on learning just what you need for your next milestone."
  },
  { 
    id: "network", 
    label: "Limited professional network", 
    advice: "Join 2-3 online communities in your field. Aim to add value by answering questions before asking for opportunities."
  },
  { 
    id: "focus", 
    label: "Trouble staying focused/motivated", 
    advice: "Create a structured accountability system with weekly check-ins and specific, measurable goals."
  }
];

// Generate default milestones based on path
const getDefaultMilestones = (path: string): ActionPlanMilestone[] => {
  const template = pathTemplates[path as keyof typeof pathTemplates];
  if (!template) return [];
  
  // Calculate dates based on milestones (spread evenly across timeframe)
  const now = new Date();
  const monthsAhead = 3; // Default to 3 months
  
  return template.milestones.map((milestone, index) => {
    const daysToAdd = Math.round((index + 1) * (monthsAhead * 30) / template.milestones.length);
    const dueDate = new Date(now);
    dueDate.setDate(dueDate.getDate() + daysToAdd);
    
    return {
      title: milestone.title,
      description: milestone.description,
      dueDate: dueDate.toISOString().split('T')[0],
      completed: false
    };
  });
};

export default function ActionPlanGenerator() {
  const [step, setStep] = useState(1);
  const [pathType, setPathType] = useState("freelancing");
  const [formData, setFormData] = useState<Partial<ActionPlan>>({
    skill: "",
    goal: "",
    targetIncome: 0,
    timeframe: "3-6 months",
    timeCommitment: "5-10 hours/week",
    roadblocks: [],
    milestones: [],
    nextSteps: [],
    resources: [],
    accountabilityMethod: "self"
  });
  
  const [actionPlan, setActionPlan] = useState<ActionPlan | null>(null);
  const [copied, setCopied] = useState(false);
  
  const handleInputChange = (field: string, value: any) => {
    setFormData({ ...formData, [field]: value });
  };
  
  const handleRoadblockToggle = (roadblockId: string, isChecked: boolean) => {
    const currentRoadblocks = formData.roadblocks || [];
    
    if (isChecked) {
      handleInputChange('roadblocks', [...currentRoadblocks, roadblockId]);
    } else {
      handleInputChange(
        'roadblocks', 
        currentRoadblocks.filter((id) => id !== roadblockId)
      );
    }
  };
  
  const nextStep = () => {
    if (step === 1) {
      // When moving from step 1 to 2, load template milestones based on chosen path
      setFormData({
        ...formData,
        milestones: getDefaultMilestones(pathType),
        resources: pathTemplates[pathType as keyof typeof pathTemplates]?.resources || []
      });
    }
    
    if (step < 4) {
      setStep(step + 1);
    } else {
      generatePlan();
    }
  };
  
  const prevStep = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };
  
  const generatePlan = () => {
    // Generate personalized next steps based on form data
    const nextSteps = [
      `Commit to spending ${formData.timeCommitment?.split('/')[0] || "5-10 hours"} per week on your action plan`,
      "Block specific time slots in your calendar for working on each milestone",
      "Join the SideHustle community to connect with others on similar paths",
      "Set up weekly check-ins to review your progress"
    ];
    
    // Generate full action plan
    const plan: ActionPlan = {
      ...formData as ActionPlan,
      nextSteps
    };
    
    setActionPlan(plan);
  };
  
  const copyToClipboard = () => {
    if (!actionPlan) return;
    
    const planText = `
ACTION PLAN: ${actionPlan.skill.toUpperCase()} MONETIZATION

GOAL: ${actionPlan.goal}
Target Income: $${actionPlan.targetIncome}
Timeframe: ${actionPlan.timeframe}
Time Commitment: ${actionPlan.timeCommitment}

MILESTONES:
${actionPlan.milestones.map((m, i) => `${i + 1}. ${m.title} (Due: ${m.dueDate})
   ${m.description}`).join('\n\n')}

NEXT STEPS:
${actionPlan.nextSteps.map((step, i) => `${i + 1}. ${step}`).join('\n')}

RESOURCES:
${actionPlan.resources.map((resource, i) => `${i + 1}. ${resource}`).join('\n')}

Generated by SideHustle.io
    `;
    
    navigator.clipboard.writeText(planText)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
  };
  
  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-xl font-medium">Basic Information</h3>
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="skill">Primary Skill or Service</Label>
                  <Input 
                    id="skill"
                    placeholder="Web Development, Content Writing, Social Media Management, etc."
                    value={formData.skill || ''}
                    onChange={(e) => handleInputChange('skill', e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="goal">Your Main Goal</Label>
                  <Textarea 
                    id="goal"
                    placeholder="Describe what you want to achieve with this monetization path..."
                    value={formData.goal || ''}
                    onChange={(e) => handleInputChange('goal', e.target.value)}
                  />
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-xl font-medium">Path Selection</h3>
              <p className="text-sm text-muted-foreground">
                Choose the monetization path that best aligns with your goals
              </p>
              
              <RadioGroup 
                value={pathType} 
                onValueChange={setPathType}
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
              >
                <div className="flex items-start space-x-2">
                  <RadioGroupItem value="freelancing" id="freelancing" className="mt-1" />
                  <div className="space-y-1">
                    <Label htmlFor="freelancing" className="font-medium">Freelancing</Label>
                    <p className="text-sm text-muted-foreground">Selling services directly to clients on a project basis</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-2">
                  <RadioGroupItem value="digital-product" id="digital-product" className="mt-1" />
                  <div className="space-y-1">
                    <Label htmlFor="digital-product" className="font-medium">Digital Product</Label>
                    <p className="text-sm text-muted-foreground">Creating and selling downloadable or subscription products</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-2">
                  <RadioGroupItem value="service-business" id="service-business" className="mt-1" />
                  <div className="space-y-1">
                    <Label htmlFor="service-business" className="font-medium">Service Business</Label>
                    <p className="text-sm text-muted-foreground">Building a structured business around your services</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-2">
                  <RadioGroupItem value="content-creation" id="content-creation" className="mt-1" />
                  <div className="space-y-1">
                    <Label htmlFor="content-creation" className="font-medium">Content Creation</Label>
                    <p className="text-sm text-muted-foreground">Building audience through content and monetizing through multiple streams</p>
                  </div>
                </div>
              </RadioGroup>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="targetIncome">Target Monthly Income ($)</Label>
                <Input 
                  id="targetIncome"
                  type="number"
                  placeholder="1000"
                  value={formData.targetIncome || ''}
                  onChange={(e) => handleInputChange('targetIncome', parseInt(e.target.value))}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="timeframe">Timeframe</Label>
                <Select 
                  value={formData.timeframe || '3-6 months'} 
                  onValueChange={(value) => handleInputChange('timeframe', value)}
                >
                  <SelectTrigger id="timeframe">
                    <SelectValue placeholder="Choose timeframe" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1-3 months">1-3 months (short-term)</SelectItem>
                    <SelectItem value="3-6 months">3-6 months (medium-term)</SelectItem>
                    <SelectItem value="6-12 months">6-12 months (long-term)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        );
        
      case 2:
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-xl font-medium">Time & Resources</h3>
              
              <div className="space-y-2">
                <Label htmlFor="timeCommitment">Weekly Time Commitment</Label>
                <Select 
                  value={formData.timeCommitment || '5-10 hours/week'} 
                  onValueChange={(value) => handleInputChange('timeCommitment', value)}
                >
                  <SelectTrigger id="timeCommitment">
                    <SelectValue placeholder="Choose time commitment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Less than 5 hours/week">Less than 5 hours/week</SelectItem>
                    <SelectItem value="5-10 hours/week">5-10 hours/week</SelectItem>
                    <SelectItem value="10-20 hours/week">10-20 hours/week</SelectItem>
                    <SelectItem value="20+ hours/week">20+ hours/week</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-xl font-medium">Potential Roadblocks</h3>
              <p className="text-sm text-muted-foreground">
                Select any challenges you anticipate facing
              </p>
              
              <div className="space-y-3">
                {commonRoadblocks.map((roadblock) => (
                  <div key={roadblock.id} className="flex items-start space-x-2">
                    <Checkbox 
                      id={roadblock.id}
                      checked={(formData.roadblocks || []).includes(roadblock.id)}
                      onCheckedChange={(checked) => 
                        handleRoadblockToggle(roadblock.id, checked === true)
                      }
                    />
                    <div className="space-y-1">
                      <label 
                        htmlFor={roadblock.id}
                        className="text-sm font-medium leading-none cursor-pointer"
                      >
                        {roadblock.label}
                      </label>
                      <p className="text-xs text-muted-foreground">
                        {roadblock.advice}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-xl font-medium">Accountability Method</h3>
              <p className="text-sm text-muted-foreground">
                Choose how you'll stay accountable to your plan
              </p>
              
              <RadioGroup 
                value={formData.accountabilityMethod || 'self'} 
                onValueChange={(value) => handleInputChange('accountabilityMethod', value)}
                className="space-y-3"
              >
                <div className="flex items-start space-x-2">
                  <RadioGroupItem value="self" id="self" className="mt-1" />
                  <div className="space-y-1">
                    <Label htmlFor="self" className="font-medium">Self-Tracking</Label>
                    <p className="text-sm text-muted-foreground">Track your own progress with regular check-ins</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-2">
                  <RadioGroupItem value="partner" id="partner" className="mt-1" />
                  <div className="space-y-1">
                    <Label htmlFor="partner" className="font-medium">Accountability Partner</Label>
                    <p className="text-sm text-muted-foreground">Pair with another SideHustle user for mutual accountability</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-2">
                  <RadioGroupItem value="public" id="public" className="mt-1" />
                  <div className="space-y-1">
                    <Label htmlFor="public" className="font-medium">Public Commitment</Label>
                    <p className="text-sm text-muted-foreground">Share goals publicly on your SideHustle profile</p>
                  </div>
                </div>
              </RadioGroup>
            </div>
          </div>
        );
      
      case 3:
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-medium">Milestones</h3>
                <p className="text-sm text-muted-foreground">
                  We've pre-populated milestones based on your chosen path
                </p>
              </div>
              
              <div className="space-y-6">
                {formData.milestones?.map((milestone, index) => (
                  <div key={index} className="space-y-3 border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Milestone className="h-5 w-5 mr-2 text-primary" />
                        <h4 className="text-base font-medium">Milestone {index + 1}</h4>
                      </div>
                      <div className="flex items-center gap-2">
                        <Label htmlFor={`milestone-date-${index}`} className="text-sm">Due date:</Label>
                        <Input
                          id={`milestone-date-${index}`}
                          type="date"
                          className="w-auto"
                          value={milestone.dueDate}
                          onChange={(e) => {
                            const updatedMilestones = [...(formData.milestones || [])];
                            updatedMilestones[index] = {
                              ...milestone,
                              dueDate: e.target.value
                            };
                            handleInputChange('milestones', updatedMilestones);
                          }}
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor={`milestone-title-${index}`}>Title</Label>
                      <Input
                        id={`milestone-title-${index}`}
                        value={milestone.title}
                        onChange={(e) => {
                          const updatedMilestones = [...(formData.milestones || [])];
                          updatedMilestones[index] = {
                            ...milestone,
                            title: e.target.value
                          };
                          handleInputChange('milestones', updatedMilestones);
                        }}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor={`milestone-desc-${index}`}>Description</Label>
                      <Textarea
                        id={`milestone-desc-${index}`}
                        value={milestone.description}
                        onChange={(e) => {
                          const updatedMilestones = [...(formData.milestones || [])];
                          updatedMilestones[index] = {
                            ...milestone,
                            description: e.target.value
                          };
                          handleInputChange('milestones', updatedMilestones);
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      
      case 4:
        return actionPlan ? (
          <div className="space-y-6">
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-primary">Your Action Plan</h3>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-1"
                  onClick={copyToClipboard}
                >
                  {copied ? (
                    <>
                      <ClipboardCheck className="h-4 w-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Clipboard className="h-4 w-4" />
                      Copy Plan
                    </>
                  )}
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Skill/Service</p>
                  <p className="font-medium">{actionPlan.skill}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Target Income</p>
                  <p className="font-medium">${actionPlan.targetIncome}/month</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Timeframe</p>
                  <p className="font-medium">{actionPlan.timeframe}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Time Commitment</p>
                  <p className="font-medium">{actionPlan.timeCommitment}</p>
                </div>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground">Goal</p>
                <p className="font-medium">{actionPlan.goal}</p>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Flag className="h-5 w-5 text-primary" />
                  <h4 className="font-semibold">Milestones</h4>
                </div>
                
                <div className="space-y-4">
                  {actionPlan.milestones.map((milestone, index) => (
                    <div key={index} className="border border-border rounded-md p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <h5 className="font-medium flex items-center">
                          <span className="bg-primary/10 text-primary h-6 w-6 rounded-full flex items-center justify-center text-sm mr-2">
                            {index + 1}
                          </span>
                          {milestone.title}
                        </h5>
                        <p className="text-sm text-muted-foreground">
                          Due: {new Date(milestone.dueDate).toLocaleDateString()}
                        </p>
                      </div>
                      <p className="text-sm">{milestone.description}</p>
                    </div>
                  ))}
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  <h4 className="font-semibold">Next Steps</h4>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {actionPlan.nextSteps.map((step, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <CircleCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <p className="text-sm">{step}</p>
                    </div>
                  ))}
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-primary" />
                  <h4 className="font-semibold">Resources</h4>
                </div>
                
                <ul className="space-y-2">
                  {actionPlan.resources.map((resource, index) => (
                    <li key={index} className="text-sm flex items-start gap-2">
                      <span className="inline-block h-5 w-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center shrink-0 mt-0.5">
                        {index + 1}
                      </span>
                      {resource}
                    </li>
                  ))}
                </ul>
              </div>
              
              {actionPlan.roadblocks && actionPlan.roadblocks.length > 0 && (
                <>
                  <Separator />
                  
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <BadgeCheck className="h-5 w-5 text-primary" />
                      <h4 className="font-semibold">Addressing Your Roadblocks</h4>
                    </div>
                    
                    <div className="space-y-3">
                      {actionPlan.roadblocks.map((roadblockId) => {
                        const roadblock = commonRoadblocks.find(r => r.id === roadblockId);
                        return roadblock ? (
                          <div key={roadblockId} className="bg-muted/50 rounded-md p-3">
                            <p className="font-medium text-sm">{roadblock.label}</p>
                            <p className="text-sm text-muted-foreground mt-1">{roadblock.advice}</p>
                          </div>
                        ) : null;
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
            
            <div className="flex items-center justify-between pt-4">
              <Button variant="outline" onClick={() => setActionPlan(null)}>
                Edit Plan
              </Button>
              
              <div className="space-x-2">
                <Button>Save to My Plans</Button>
                <Button variant="outline">Print</Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center p-12">
            <div className="space-y-4 text-center">
              <h3 className="text-xl font-bold">Generating Your Action Plan</h3>
              <div className="flex justify-center">
                <Progress value={75} className="w-48" />
              </div>
              <p className="text-muted-foreground">Please wait while we create your personalized plan...</p>
            </div>
          </div>
        );
        
      default:
        return null;
    }
  };
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Goal className="h-5 w-5" />
          Action Plan Generator
        </CardTitle>
        <CardDescription>
          Create a structured roadmap to achieve your monetization goals
        </CardDescription>
      </CardHeader>
      
      {!actionPlan && (
        <div className="px-6">
          <div className="w-full flex justify-between mb-6">
            {[1, 2, 3, 4].map((stepNumber) => (
              <div 
                key={stepNumber}
                className={`flex flex-col items-center ${stepNumber <= step ? "text-primary" : "text-muted-foreground"}`}
              >
                <div 
                  className={`h-10 w-10 rounded-full flex items-center justify-center text-sm mb-1 ${
                    stepNumber < step 
                      ? "bg-primary text-primary-foreground" 
                      : stepNumber === step 
                        ? "bg-primary/20 text-primary border border-primary" 
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {stepNumber < step ? <CheckCircle className="h-5 w-5" /> : stepNumber}
                </div>
                <span className="text-xs font-medium">
                  {stepNumber === 1 && "Basics"}
                  {stepNumber === 2 && "Resources"}
                  {stepNumber === 3 && "Milestones"}
                  {stepNumber === 4 && "Complete"}
                </span>
              </div>
            ))}
          </div>
          <Progress value={(step / 4) * 100} className="mb-6" />
        </div>
      )}
      
      <CardContent>
        {renderStep()}
      </CardContent>
      
      {!actionPlan && step < 4 && (
        <CardFooter className="flex justify-between">
          <Button 
            variant="outline" 
            onClick={prevStep}
            disabled={step === 1}
          >
            Previous
          </Button>
          <Button onClick={nextStep}>
            {step < 3 ? "Continue" : "Generate Plan"}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}