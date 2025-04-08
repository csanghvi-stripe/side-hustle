import React, { useState } from "react";
import AppHeader from "@/components/AppHeader";
import DiscoveryForm from "@/components/DiscoveryForm";
import ResultsDisplay from "@/components/ResultsDisplay";
import { MonetizationResults } from "@/types";

const Home: React.FC = () => {
  const [results, setResults] = useState<MonetizationResults | null>(null);

  const handleResultsReceived = (newResults: MonetizationResults) => {
    setResults(newResults);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleReset = () => {
    setResults(null);
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      <AppHeader />
      
      <main className="max-w-6xl mx-auto px-4 py-8">
        {!results ? (
          <DiscoveryForm onResultsReceived={handleResultsReceived} />
        ) : (
          <ResultsDisplay results={results} onReset={handleReset} />
        )}
      </main>
      
      <footer className="bg-white border-t border-neutral-200 py-6 mt-12">
        <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center">
          <div className="text-neutral-400 text-sm mb-4 md:mb-0">
            © {new Date().getFullYear()} Monetization Discovery Agent. All rights reserved.
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
