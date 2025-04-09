import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calculator, DollarSign, Clock, Briefcase, BarChart4 } from "lucide-react";

// Market data (this would ideally come from a database)
const skillMarketRates: Record<string, { hourly: number[]; project: number[]; }> = {
  "Web Development": { hourly: [25, 150], project: [500, 10000] },
  "Mobile Development": { hourly: [30, 175], project: [1000, 15000] },
  "Graphic Design": { hourly: [20, 100], project: [200, 3000] },
  "Content Writing": { hourly: [15, 75], project: [100, 1500] },
  "Digital Marketing": { hourly: [20, 120], project: [300, 5000] },
  "Video Editing": { hourly: [25, 110], project: [200, 3000] },
  "Social Media Management": { hourly: [15, 90], project: [250, 2500] },
  "UI/UX Design": { hourly: [30, 150], project: [500, 7500] },
  "Project Management": { hourly: [25, 125], project: [1000, 10000] },
  "Virtual Assistance": { hourly: [15, 50], project: [100, 1000] },
  "Coaching": { hourly: [50, 300], project: [500, 5000] },
  "Photography": { hourly: [50, 250], project: [200, 3000] },
  "SEO": { hourly: [20, 100], project: [300, 3000] },
  "Translation": { hourly: [20, 80], project: [100, 1000] },
};

// Experience levels and their multipliers
const experienceLevels = [
  { id: "beginner", label: "Beginner", multiplier: 0.6 },
  { id: "intermediate", label: "Intermediate", multiplier: 1.0 },
  { id: "advanced", label: "Advanced", multiplier: 1.4 },
  { id: "expert", label: "Expert", multiplier: 2.0 }
];

// Market demand adjustments
const marketDemandMultipliers = {
  "very-high": { label: "Very High", multiplier: 1.3 },
  "high": { label: "High", multiplier: 1.15 },
  "medium": { label: "Medium", multiplier: 1.0 },
  "low": { label: "Low", multiplier: 0.85 }
};

export default function PricingCalculator() {
  const [skill, setSkill] = useState<string>("");
  const [experienceLevel, setExperienceLevel] = useState("intermediate");
  const [marketDemand, setMarketDemand] = useState("medium");
  const [additionalFactors, setAdditionalFactors] = useState({
    specialization: false,
    certification: false,
    portfolio: false,
    rush: false
  });
  const [valuePosition, setValuePosition] = useState(50); // 0-100 slider
  const [pricingModel, setPricingModel] = useState("hourly");
  
  // Calculate price range based on selected factors
  const calculatePriceRange = () => {
    if (!skill || !skillMarketRates[skill]) {
      return { min: 0, max: 0, recommended: 0 };
    }
    
    const baseRates = skillMarketRates[skill][pricingModel as "hourly" | "project"];
    const [baseMin, baseMax] = baseRates;
    
    // Get experience multiplier
    const expMultiplier = experienceLevels.find(el => el.id === experienceLevel)?.multiplier || 1.0;
    
    // Get market demand multiplier
    const demandMultiplier = marketDemandMultipliers[marketDemand as keyof typeof marketDemandMultipliers].multiplier;
    
    // Calculate additional factor adjustments
    let additionalMultiplier = 1.0;
    if (additionalFactors.specialization) additionalMultiplier += 0.1;
    if (additionalFactors.certification) additionalMultiplier += 0.15;
    if (additionalFactors.portfolio) additionalMultiplier += 0.05;
    if (additionalFactors.rush) additionalMultiplier += 0.2;
    
    // Apply all multipliers
    const adjustedMin = Math.round(baseMin * expMultiplier * demandMultiplier * additionalMultiplier);
    const adjustedMax = Math.round(baseMax * expMultiplier * demandMultiplier * additionalMultiplier);
    
    // Calculate recommended price based on value position slider
    const range = adjustedMax - adjustedMin;
    const recommended = Math.round(adjustedMin + (range * (valuePosition / 100)));
    
    return { min: adjustedMin, max: adjustedMax, recommended };
  };
  
  const priceRange = calculatePriceRange();
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Pricing Calculator
        </CardTitle>
        <CardDescription>
          Determine competitive rates for your services based on market data and your unique value
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs defaultValue="calculate" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="calculate">Calculate Rates</TabsTrigger>
            <TabsTrigger value="guidance">Pricing Guidance</TabsTrigger>
          </TabsList>
          
          <TabsContent value="calculate" className="space-y-6 pt-4">
            {/* Skill Selection */}
            <div className="space-y-2">
              <Label htmlFor="skill">What service are you pricing?</Label>
              <Select value={skill} onValueChange={setSkill}>
                <SelectTrigger id="skill">
                  <SelectValue placeholder="Select your skill or service" />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(skillMarketRates).map((skillName) => (
                    <SelectItem key={skillName} value={skillName}>
                      {skillName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Pricing Model */}
            <div className="space-y-3">
              <Label>Pricing Model</Label>
              <div className="flex gap-4">
                <Button 
                  variant={pricingModel === "hourly" ? "default" : "outline"} 
                  className="flex-1"
                  onClick={() => setPricingModel("hourly")}
                >
                  <Clock className="h-4 w-4 mr-2" />
                  Hourly Rate
                </Button>
                <Button 
                  variant={pricingModel === "project" ? "default" : "outline"} 
                  className="flex-1"
                  onClick={() => setPricingModel("project")}
                >
                  <Briefcase className="h-4 w-4 mr-2" />
                  Project-Based
                </Button>
              </div>
            </div>
            
            {/* Experience Level */}
            <div className="space-y-2">
              <Label htmlFor="experience">Your Experience Level</Label>
              <Select value={experienceLevel} onValueChange={setExperienceLevel}>
                <SelectTrigger id="experience">
                  <SelectValue placeholder="Select your experience level" />
                </SelectTrigger>
                <SelectContent>
                  {experienceLevels.map((level) => (
                    <SelectItem key={level.id} value={level.id}>
                      {level.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Market Demand */}
            <div className="space-y-2">
              <Label htmlFor="demand">Market Demand</Label>
              <Select value={marketDemand} onValueChange={setMarketDemand}>
                <SelectTrigger id="demand">
                  <SelectValue placeholder="Select market demand" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(marketDemandMultipliers).map(([id, { label }]) => (
                    <SelectItem key={id} value={id}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Additional Value Factors */}
            <div className="space-y-3">
              <Label>Additional Value Factors</Label>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="specialization">Specialized Niche Focus</Label>
                    <p className="text-sm text-muted-foreground">You offer specialized expertise in a specific area</p>
                  </div>
                  <Switch 
                    id="specialization"
                    checked={additionalFactors.specialization}
                    onCheckedChange={(checked) => 
                      setAdditionalFactors({...additionalFactors, specialization: checked})
                    }
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="certification">Formal Certification</Label>
                    <p className="text-sm text-muted-foreground">You have relevant professional certifications</p>
                  </div>
                  <Switch 
                    id="certification"
                    checked={additionalFactors.certification}
                    onCheckedChange={(checked) => 
                      setAdditionalFactors({...additionalFactors, certification: checked})
                    }
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="portfolio">Strong Portfolio</Label>
                    <p className="text-sm text-muted-foreground">You have an impressive portfolio of past work</p>
                  </div>
                  <Switch 
                    id="portfolio"
                    checked={additionalFactors.portfolio}
                    onCheckedChange={(checked) => 
                      setAdditionalFactors({...additionalFactors, portfolio: checked})
                    }
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="rush">Rush Service Available</Label>
                    <p className="text-sm text-muted-foreground">You offer expedited turnaround times</p>
                  </div>
                  <Switch 
                    id="rush"
                    checked={additionalFactors.rush}
                    onCheckedChange={(checked) => 
                      setAdditionalFactors({...additionalFactors, rush: checked})
                    }
                  />
                </div>
              </div>
            </div>
            
            {/* Value Positioning */}
            <div className="space-y-3">
              <div className="flex justify-between">
                <Label>Value Positioning</Label>
                <span className="text-sm text-muted-foreground">{valuePosition}%</span>
              </div>
              <Slider
                defaultValue={[50]}
                max={100}
                step={5}
                value={[valuePosition]}
                onValueChange={(value) => setValuePosition(value[0])}
              />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Budget</span>
                <span>Premium</span>
              </div>
            </div>
            
            {/* Results */}
            <Card className="bg-primary/5 border border-primary/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Your Pricing Recommendation</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col md:flex-row gap-4 md:gap-8">
                  <div className="flex-1">
                    <div className="text-sm text-muted-foreground mb-1">Market Range</div>
                    <div className="flex items-center">
                      <DollarSign className="h-4 w-4 text-muted-foreground mr-1" />
                      <span className="text-lg font-medium">{priceRange.min} - {priceRange.max}</span>
                      <span className="ml-1 text-muted-foreground">
                        {pricingModel === "hourly" ? "/hr" : ""}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    <div className="text-sm text-muted-foreground mb-1">Recommended Price</div>
                    <div className="flex items-center">
                      <DollarSign className="h-5 w-5 text-primary mr-1" />
                      <span className="text-2xl font-bold text-primary">{priceRange.recommended}</span>
                      <span className="ml-1 text-muted-foreground">
                        {pricingModel === "hourly" ? "/hr" : ""}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="guidance" className="space-y-6 pt-4">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center">
                <BarChart4 className="h-5 w-5 mr-2 text-primary" />
                Pricing Strategy Guidance
              </h3>
              
              <div className="space-y-3">
                <h4 className="font-medium">Common Pricing Mistakes</h4>
                <ul className="list-disc pl-6 space-y-1 text-sm">
                  <li><strong>Starting too low:</strong> Undercharging makes it difficult to raise rates later and can signal low quality.</li>
                  <li><strong>Focusing only on hourly rates:</strong> Consider value-based or project-based pricing to avoid time-for-money limitations.</li>
                  <li><strong>Not accounting for all costs:</strong> Remember to factor in taxes, software, equipment, and your professional development.</li>
                  <li><strong>Ignoring market positioning:</strong> Your rates should reflect your target client segment and brand positioning.</li>
                </ul>
              </div>
              
              <div className="space-y-3">
                <h4 className="font-medium">Different Pricing Models</h4>
                <div className="space-y-4">
                  <div>
                    <h5 className="text-sm font-semibold">Hourly Rate</h5>
                    <p className="text-sm text-muted-foreground">
                      Best for: Variable scope projects, ongoing work, situations where the timeline is uncertain.
                    </p>
                  </div>
                  
                  <div>
                    <h5 className="text-sm font-semibold">Project-Based Pricing</h5>
                    <p className="text-sm text-muted-foreground">
                      Best for: Well-defined projects with clear deliverables. Allows you to price based on value rather than time.
                    </p>
                  </div>
                  
                  <div>
                    <h5 className="text-sm font-semibold">Retainer</h5>
                    <p className="text-sm text-muted-foreground">
                      Best for: Ongoing services where the client needs regular access to your expertise or services.
                    </p>
                  </div>
                  
                  <div>
                    <h5 className="text-sm font-semibold">Value-Based Pricing</h5>
                    <p className="text-sm text-muted-foreground">
                      Best for: Projects where your work will generate significant value or ROI for the client.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                <h4 className="font-medium">Tips for Communicating Your Rates</h4>
                <ul className="list-disc pl-6 space-y-1 text-sm">
                  <li>Focus on the value and outcomes you deliver, not just your time</li>
                  <li>Include your rates in your initial proposal to set expectations early</li>
                  <li>Have a clear explanation ready for why your rates are worth it</li>
                  <li>Consider offering pricing tiers to give clients options</li>
                  <li>Practice saying your rates confidently without apologizing or justifying</li>
                </ul>
              </div>
              
              <Button onClick={() => document.getElementById("calculate-tab")?.click()}>
                Use the Calculator
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="flex justify-between pt-0">
        <p className="text-xs text-muted-foreground">
          *Rates are based on current market data and your specific value factors
        </p>
      </CardFooter>
    </Card>
  );
}