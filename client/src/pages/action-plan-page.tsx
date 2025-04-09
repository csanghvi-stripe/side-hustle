import React from "react";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import ActionPlanGenerator from "@/components/analytics/ActionPlanGenerator";

export default function ActionPlanPage() {
  const { user } = useAuth();
  
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="text-center p-8 max-w-md mx-auto">
          <h1 className="text-2xl font-bold mb-4">Please Login</h1>
          <p className="text-muted-foreground mb-6">
            You need to be logged in to access the Action Plan Generator.
          </p>
          <Button asChild>
            <Link href="/auth">Login or Register</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <Button variant="ghost" size="sm" asChild className="mb-4">
            <Link href="/analytics" className="flex items-center">
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back to Analytics Dashboard
            </Link>
          </Button>
          
          <h1 className="text-3xl font-bold">Action Plan Generator</h1>
          <p className="text-muted-foreground mt-2 max-w-3xl">
            Create a personalized step-by-step action plan to monetize your skills. 
            The generator considers your unique skills, goals, and resources to build 
            a roadmap designed for your success.
          </p>
        </div>
        
        <div className="mt-8">
          <ActionPlanGenerator />
        </div>
      </main>
    </div>
  );
}