import React, { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import ActionPlanGenerator from "@/components/analytics/ActionPlanGenerator";
import ProgressTrackingSystem from "@/components/analytics/ProgressTrackingSystem";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info, AlertCircle } from "lucide-react";

export default function ActionPlanPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"generator" | "progress">("generator");
  
  // Fetch user's action plans
  const { data: actionPlans, isLoading } = useQuery({
    queryKey: ["/api/analytics/action-plans"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/analytics/action-plans");
      return await res.json();
    },
  });
  
  // Select the first action plan or null if none exists
  const activeActionPlan = actionPlans && actionPlans.length > 0 ? actionPlans[0] : null;
  
  // When a new plan is generated, switch to the progress tab
  const handlePlanGenerated = (plan: any) => {
    setActiveTab("progress");
    toast({
      title: "Action Plan Created",
      description: "Your personalized action plan has been created successfully.",
      variant: "default",
    });
  };
  
  return (
    <div className="container py-8 max-w-6xl">
      <h1 className="text-3xl font-bold mb-6">Monetization Action Plan</h1>
      
      <div className="mb-6">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "generator" | "progress")} className="w-full">
          <TabsList className="grid grid-cols-2 mb-8">
            <TabsTrigger value="generator">Plan Generator</TabsTrigger>
            <TabsTrigger value="progress" disabled={!activeActionPlan}>Progress Tracking</TabsTrigger>
          </TabsList>
          
          <TabsContent value="generator" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Action Plan Generator</CardTitle>
                <CardDescription>
                  Create a personalized roadmap to monetize your skills and track your progress
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ActionPlanGenerator />
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="progress" className="space-y-6">
            {activeActionPlan ? (
              <Card>
                <CardHeader>
                  <CardTitle>{activeActionPlan.title || "Your Action Plan"}</CardTitle>
                  <CardDescription>
                    Track your progress and get AI-powered recommendations
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ProgressTrackingSystem actionPlan={activeActionPlan} />
                </CardContent>
              </Card>
            ) : (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>No Action Plan Found</AlertTitle>
                <AlertDescription>
                  You don't have any action plans yet. Create one using the Plan Generator.
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>
        </Tabs>
      </div>
      
      <div className="mt-8">
        <Alert className="bg-primary/5 border-primary/20">
          <Info className="h-4 w-4 text-primary" />
          <AlertTitle>Pro Tip</AlertTitle>
          <AlertDescription>
            Consistent small actions lead to big results. Focus on completing 2-3 tasks per week to maintain momentum.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}