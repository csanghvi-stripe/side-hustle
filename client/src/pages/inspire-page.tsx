import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useMutation } from "@tanstack/react-query";
import ResultsDisplay from "@/components/ResultsDisplay";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

interface InspirePageProps {
  // Add any props here if needed
}

const InspirePage: React.FC<InspirePageProps> = () => {
  const [, setLocation] = useLocation();
  const [results, setResults] = useState<any | null>(null);
  const [saved, setSaved] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  // Load results from localStorage on mount
  useEffect(() => {
    const storedResults = localStorage.getItem("searchResults");
    if (storedResults) {
      try {
        const parsedResults = JSON.parse(storedResults);
        setResults(parsedResults);
      } catch (error) {
        console.error("Error parsing search results:", error);
        toast({
          title: "Error",
          description: "Could not load search results. Please try searching again.",
          variant: "destructive"
        });
        setLocation("/");
      }
    } else {
      // If no results, redirect to home
      toast({
        title: "No results found",
        description: "Please start a search first",
        variant: "default"
      });
      setLocation("/");
    }
  }, []);

  // Mutation for saving the results
  const saveOpportunityMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/opportunities", {
        opportunityData: results
      });
      return await res.json();
    },
    onSuccess: () => {
      setSaved(true);
      queryClient.invalidateQueries({ queryKey: ["/api/opportunities"] });
      toast({
        title: "Success",
        description: "Opportunities saved to your account",
        variant: "default"
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to save opportunities: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  // Handle Reset - go back to home
  const handleReset = () => {
    localStorage.removeItem("searchResults");
    setLocation("/");
  };

  // Handle Save button click
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

  if (!results) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-4">Loading results...</h2>
          <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
          <Button 
            variant="ghost" 
            className="mt-6"
            onClick={() => setLocation("/")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Search
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">      
      <main className="max-w-6xl mx-auto px-4 py-8">
        <ResultsDisplay 
          results={results} 
          onReset={handleReset} 
          saved={saved}
          onSave={handleSave}
        />
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

export default InspirePage;