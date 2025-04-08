import React, { useState } from "react";
import AppHeader from "@/components/AppHeader";
import DiscoveryForm from "@/components/DiscoveryForm";
import ResultsDisplay from "@/components/ResultsDisplay";
import { MonetizationResults } from "@/types";
import { useAuth } from "@/hooks/use-auth";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { BookmarkPlus, ArrowRight } from "lucide-react";
import { Link } from "wouter";

const Home: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [results, setResults] = useState<MonetizationResults | null>(null);
  const [saved, setSaved] = useState(false);

  const handleResultsReceived = (newResults: MonetizationResults) => {
    setResults(newResults);
    setSaved(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleReset = () => {
    setResults(null);
    setSaved(false);
  };
  
  // Save the current search results
  const saveOpportunityMutation = useMutation({
    mutationFn: async () => {
      if (!results) return;
      
      // Extract skills from the results to organize saved opportunities
      const skills = results.userProfile?.skills || [];
      
      // Create a descriptive title based on skills
      const skillsText = skills.join(", ");
      const title = `Monetization opportunities for ${skillsText}`;
      
      const res = await apiRequest("POST", "/api/opportunities", {
        opportunityData: results,
        skills: skills,
        title: title,
        shared: false // Default to private
      });
      
      return await res.json();
    },
    onSuccess: () => {
      setSaved(true);
      queryClient.invalidateQueries({ queryKey: ["/api/opportunities"] });
      toast({
        title: "Recommendations saved!",
        description: "You can view your saved opportunities in your profile."
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to save",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Handle the save button click
  const handleSave = () => {
    if (results && user) {
      saveOpportunityMutation.mutate();
    } else if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to save your search results",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      <AppHeader />
      
      <main className="max-w-6xl mx-auto px-4 py-8">
        {!results ? (
          <DiscoveryForm onResultsReceived={handleResultsReceived} />
        ) : (
          <ResultsDisplay 
            results={results} 
            onReset={handleReset} 
            saved={saved}
            onSave={handleSave}
          />
        )}
      </main>
      
      <footer className="bg-white border-t border-neutral-200 py-6 mt-12">
        <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center">
          <div className="text-neutral-400 text-sm mb-4 md:mb-0">
            © {new Date().getFullYear()} SideHustle. All rights reserved.
          </div>
          <div className="flex space-x-6">
            <a href="#" className="text-neutral-500 hover:text-primary text-sm">Help Center</a>
            <a href="#" className="text-neutral-500 hover:text-primary text-sm">Privacy Policy</a>
            <a href="#" className="text-neutral-500 hover:text-primary text-sm">Terms of Service</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
