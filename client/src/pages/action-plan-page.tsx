import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import ActionPlanGenerator from "@/components/analytics/ActionPlanGenerator";
import ProgressTrackingSystem from "@/components/analytics/ProgressTrackingSystem";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Info, AlertCircle, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function ActionPlanPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"generator" | "progress">("generator");
  const [opportunityId, setOpportunityId] = useState<string | null>(null);
  const [opportunityName, setOpportunityName] = useState<string | null>(null);
  
  // Extract opportunity ID from URL if present
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const id = searchParams.get('opportunityId');
    if (id) {
      setOpportunityId(id);
      // Attempt to get the opportunity name from local storage or leave null
      const storedName = localStorage.getItem(`opportunity_${id}_name`);
      if (storedName) {
        setOpportunityName(storedName);
      }
    }
  }, []);
  
  // Fetch user's action plans
  const { data: actionPlans, isLoading } = useQuery({
    queryKey: ["/api/analytics/action-plans"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/analytics/action-plans");
      return await res.json();
    },
  });
  
  // Fetch opportunity details if we have an ID but no name
  useEffect(() => {
    if (opportunityId && !opportunityName) {
      // This is a placeholder - in a real implementation, you would fetch the opportunity details
      // For now, set a default name
      setOpportunityName("Selected Opportunity");
    }
  }, [opportunityId, opportunityName]);
  
  // Select the first action plan or null if none exists
  const activeActionPlan = actionPlans && actionPlans.length > 0 ? actionPlans[0] : null;
  
  // When a new plan is generated, switch to the progress tab
  const handlePlanGenerated = (plan: any) => {
    setActiveTab("progress");
    toast({
      title: "Action Plan Saved",
      description: "Your personalized action plan has been saved successfully.",
      variant: "default",
    });
  };
  
  return (
    <div className="container py-8 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Monetization Action Plan</h1>
          {opportunityName && (
            <div className="mt-2 flex items-center">
              <Badge variant="outline" className="mr-2">Based on opportunity</Badge>
              <span className="text-primary font-medium">{opportunityName}</span>
            </div>
          )}
        </div>
        
        <Link href="/saved-opportunities" className="flex items-center text-sm text-neutral-500 hover:text-neutral-700 mt-4 md:mt-0">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Opportunities
        </Link>
      </div>
      
      <div className="mb-6">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "generator" | "progress")} className="w-full">
          <TabsList className="grid grid-cols-2 mb-8">
            <TabsTrigger value="generator">Plan Generator</TabsTrigger>
            <TabsTrigger value="progress" disabled={!activeActionPlan}>Progress Tracking</TabsTrigger>
          </TabsList>
          
          <TabsContent value="generator" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>
                  Action Plan Generator
                  {opportunityName && (
                    <Badge variant="secondary" className="ml-3 font-normal">
                      For: {opportunityName}
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  Create a personalized roadmap to monetize your skills and track your progress
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ActionPlanGenerator opportunityId={opportunityId ? parseInt(opportunityId) : undefined} />
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