import React from "react";
import DiscoveryForm from "@/components/DiscoveryForm";
import { MonetizationResults } from "@/types";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useResults } from "@/contexts/ResultsContext";

const Home: React.FC = () => {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { setResults, setSource } = useResults();

  const handleResultsReceived = (newResults: MonetizationResults) => {
    // Store results in context for persistence across components
    setResults(newResults);
    
    // Set source to track navigation origin
    setSource('search');
    
    // Navigate to the inspire page
    setLocation(`/inspire`);

    toast({
      title: "Generating opportunities...",
      description: "We've found some great ways to monetize your skills!",
    });
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      <main className="max-w-6xl mx-auto px-4 py-8">
        <DiscoveryForm onResultsReceived={handleResultsReceived} />
      </main>

      <footer className="bg-white border-t border-neutral-200 py-6 mt-12">
        <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center">
          <div className="text-neutral-400 text-sm mb-4 md:mb-0">
            © {new Date().getFullYear()} SideHustle. All rights reserved.
          </div>
          <div className="flex space-x-6">
            <a href="#" className="text-neutral-500 hover:text-primary text-sm">
              Help Center
            </a>
            <a href="#" className="text-neutral-500 hover:text-primary text-sm">
              Privacy Policy
            </a>
            <a href="#" className="text-neutral-500 hover:text-primary text-sm">
              Terms of Service
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
