import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import SkillAssessmentTool from "@/components/assessment/SkillAssessmentTool";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HelpCircle, ChevronRight, Brain, PanelTop, LineChart } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function SkillsAssessmentPage() {
  const { user, isLoading } = useAuth();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("assessment");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) {
    navigate("/auth");
    return null;
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="max-w-6xl mx-auto px-4 py-8 sm:px-6 space-y-8">
      <div className="flex flex-col lg:flex-row gap-6 lg:gap-12 items-start">
        {/* Main Content */}
        <div className="flex-1 space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Skill Assessment</h1>
              <p className="text-muted-foreground">
                Discover your most marketable skills and monetization opportunities
              </p>
            </div>
          </div>

          <Tabs defaultValue="assessment" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-2 w-full max-w-md mb-6">
              <TabsTrigger value="assessment">Assessment</TabsTrigger>
              <TabsTrigger value="guidance">Guidance</TabsTrigger>
            </TabsList>
            
            <TabsContent value="assessment">
              <SkillAssessmentTool />
            </TabsContent>
            
            <TabsContent value="guidance">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Brain className="h-5 w-5 mr-2 text-primary" />
                    Skill Discovery Guidance
                  </CardTitle>
                  <CardDescription>
                    Tips to help you identify your most marketable skills
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Discovering Hidden Skills</h3>
                    <p>
                      Many people undervalue skills they've developed naturally over time. 
                      Here are some ways to identify skills you might not realize are valuable:
                    </p>
                    <ul className="list-disc pl-6 space-y-2">
                      <li>
                        <strong>Ask friends and colleagues:</strong> What do they think you're especially good at?
                      </li>
                      <li>
                        <strong>Review past feedback:</strong> Look at performance reviews or client testimonials for patterns.
                      </li>
                      <li>
                        <strong>Consider what people ask you for help with:</strong> These requests often point to your unique strengths.
                      </li>
                      <li>
                        <strong>Identify your "flow" activities:</strong> Tasks where you lose track of time often indicate natural aptitude.
                      </li>
                    </ul>
                  </div>
                  
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Evaluating Market Demand</h3>
                    <p>
                      Not all skills have equal market value. Here's how to determine 
                      if your skills are in demand:
                    </p>
                    <ul className="list-disc pl-6 space-y-2">
                      <li>
                        <strong>Browse freelancing platforms:</strong> Check sites like Upwork, Fiverr, or specialized marketplaces in your field.
                      </li>
                      <li>
                        <strong>Search job boards:</strong> Even if you don't want a full-time job, listings show what skills employers value.
                      </li>
                      <li>
                        <strong>Research industry reports:</strong> Look for skills gaps or growing demand in reports from professional associations.
                      </li>
                      <li>
                        <strong>Join community forums:</strong> See what services people are frequently looking for in your area of expertise.
                      </li>
                    </ul>
                  </div>
                  
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Overcoming Mindset Barriers</h3>
                    <p>
                      Many people struggle with psychological barriers that prevent them 
                      from recognizing or monetizing their skills:
                    </p>
                    <ul className="list-disc pl-6 space-y-2">
                      <li>
                        <strong>Imposter syndrome:</strong> Remember that even experts started as beginners. Focus on the value you can provide, not on being perfect.
                      </li>
                      <li>
                        <strong>Undervaluing "easy" skills:</strong> If something comes easily to you, you might assume it's easy for everyone. It's not!
                      </li>
                      <li>
                        <strong>Fear of rejection:</strong> Start with low-risk opportunities to build confidence and collect testimonials.
                      </li>
                      <li>
                        <strong>Lack of clarity:</strong> Use our assessment tool to gain objective insights about your marketable skills.
                      </li>
                    </ul>
                    
                    <Button onClick={() => setActiveTab("assessment")} className="mt-4">
                      Take the Assessment
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
        
        {/* Sidebar */}
        <div className="w-full lg:w-80 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <HelpCircle className="h-5 w-5 mr-2" />
                Why Assess Your Skills?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm">
                Our skill assessment helps you identify your most marketable talents,
                even ones you might not realize have value in today's economy.
              </p>
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <PanelTop className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium">Discover Hidden Potential</h4>
                    <p className="text-xs text-muted-foreground">
                      Uncover skills you've developed that are in high demand.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <LineChart className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium">Market Demand Insights</h4>
                    <p className="text-xs text-muted-foreground">
                      See which of your skills have the highest earning potential.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Next Steps</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm">
                After completing your assessment:
              </p>
              <ol className="space-y-2 text-sm pl-5 list-decimal">
                <li>Use our Pricing Calculator to set competitive rates</li>
                <li>Create an Action Plan for your first monetization project</li>
                <li>Find peers in our Community section for collaboration and support</li>
              </ol>
              <Button variant="outline" className="w-full" disabled>
                Pricing Calculator (Coming Soon)
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
      </div>
    </div>
  );
}